<script lang="ts">
  import { onMount } from 'svelte';
  import * as api from './api';
  import type { Book, Timeline, TimelineWord, User } from './api';
  import { queueSettings } from './settings';
  import { t } from './i18n.svelte';

  let {
    book,
    timeline,
    user,
    onExit,
    onWpm,
  }: {
    book: Book;
    timeline: Timeline;
    user: User;
    onExit: () => void;
    /** Reports WPM changes upward so the in-memory user stays in sync. */
    onWpm?: (wpm: number) => void;
  } = $props();

  // The reader is mounted fresh per book (App keys the view), so capturing the
  // initial `book`/`timeline` values here is intentional.
  // svelte-ignore state_referenced_locally
  const words = timeline.words;
  const total = words.length;

  const clampWpm = (n: number) => Math.min(800, Math.max(150, Math.round(n / 25) * 25));

  // resume from server-side position; a finished book restarts from the top
  // svelte-ignore state_referenced_locally
  let index = $state(book.position >= total ? 0 : Math.max(0, book.position));
  let playing = $state(false);
  let finished = $state(false);
  // svelte-ignore state_referenced_locally
  let wpm = $state(clampWpm(user.settings.wpm));

  // svelte-ignore state_referenced_locally
  let lastWpm = wpm;
  $effect(() => {
    if (wpm !== lastWpm) {
      lastWpm = wpm;
      onWpm?.(wpm);
      queueSettings({ wpm }); // debounced PATCH — speed follows the account
    }
  });

  // ---- vsync-locked scheduler (CONTRACTS.md: rAF accumulator, never setTimeout) ----
  let raf = 0;
  let last = 0;
  let acc = 0;

  // ---- stats: words consumed by natural advance (not by seeking) ----
  let consumed = 0; // since the last position report
  let sessionWords = 0; // whole session
  let activeMs = 0; // time actually playing
  let sessionStart = 0; // epoch ms of the first play

  // ---- WPM ramp (CONTRACTS v0.4 "car motor"): every play start eases from
  // 60% to 100% of the target over the first 3s of active playback. Seeking
  // keeps the ramp; pause→resume restarts it. The slider always shows target.
  const RAMP_MS = 3000;
  let rampMs = RAMP_MS;

  function duration(i: number): number {
    const factor = Math.min(1, 0.6 + 0.4 * (rampMs / RAMP_MS));
    const eff = Math.max(100, wpm * factor);
    return words[i][2] * (60000 / eff);
  }

  function frame(now: number) {
    const delta = now - last;
    acc += delta;
    activeMs += delta;
    rampMs = Math.min(RAMP_MS, rampMs + delta);
    last = now;
    let dur = duration(index);
    while (acc >= dur) {
      acc -= dur;
      consumed += 1;
      sessionWords += 1;
      if (index + 1 >= total) {
        finish();
        return;
      }
      index += 1;
      dur = duration(index);
    }
    raf = requestAnimationFrame(frame);
  }

  function play() {
    if (playing || total === 0) return;
    if (finished) {
      index = 0;
      acc = 0;
      finished = false;
    }
    if (sessionStart === 0) sessionStart = Date.now();
    rampMs = 0; // ease in from 60% on every (re)start
    playing = true;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  function pause() {
    if (!playing) return;
    playing = false;
    cancelAnimationFrame(raf);
    void savePosition();
  }

  function toggle() {
    if (playing) pause();
    else play();
  }

  function finish() {
    playing = false;
    finished = true;
    cancelAnimationFrame(raf);
    void savePosition();
  }

  // ---- position + read-words sync: every 5s while playing, on pause, on exit ----
  // svelte-ignore state_referenced_locally
  let lastSent = book.position;

  async function savePosition() {
    const pos = finished ? total : index;
    const read = Math.min(consumed, 500);
    if (pos === lastSent && read === 0) return;
    lastSent = pos;
    consumed = 0;
    try {
      await api.savePosition(book.id, pos, read, api.localDay());
    } catch {
      lastSent = -1; // retry on the next save
      consumed += read;
    }
  }

  /** Running-app-style session summary, once per reader visit. */
  function logSession() {
    if (sessionStart === 0 || activeMs < 10_000 || sessionWords === 0) return;
    const avg = Math.round(sessionWords / (activeMs / 60_000));
    void api
      .createSession({
        book_id: book.id,
        started_at: Math.floor(sessionStart / 1000),
        duration_ms: Math.round(activeMs),
        words: sessionWords,
        avg_wpm: avg,
      })
      .catch(() => {});
  }

  // ---- sentence navigation (boundary = weight >= 2.0: sentence/paragraph enders) ----
  function isBoundary(i: number): boolean {
    return words[i][2] >= 2.0;
  }

  function seek(i: number) {
    index = Math.min(Math.max(0, i), total - 1);
    acc = 0;
    finished = false;
  }

  /** First word of the sentence containing (or preceding) `from`. */
  function sentenceStart(from: number): number {
    let j = from - 1;
    while (j >= 0 && !isBoundary(j)) j -= 1;
    return j + 1;
  }

  function back() {
    const start = sentenceStart(index);
    seek(index > start ? start : sentenceStart(start - 1));
  }

  function forward() {
    let j = index;
    while (j < total && !isBoundary(j)) j += 1;
    seek(j + 1);
  }

  function exit() {
    if (playing) pause();
    else void savePosition();
    logSession();
    sessionStart = 0;
    onExit();
  }

  function onKey(e: KeyboardEvent) {
    const target = e.target as HTMLElement | null;
    const onSlider = !!target && target.tagName === 'INPUT';
    switch (e.key) {
      case ' ':
        e.preventDefault();
        toggle();
        break;
      case 'ArrowLeft':
        if (onSlider) return; // arrows on the focused slider adjust wpm
        e.preventDefault();
        back();
        break;
      case 'ArrowRight':
        if (onSlider) return;
        e.preventDefault();
        forward();
        break;
      case 'Escape':
        e.preventDefault();
        exit();
        break;
    }
  }

  onMount(() => {
    // never autoplay under prefers-reduced-motion
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) play();
    const tick = setInterval(() => {
      if (playing) void savePosition();
    }, 5000);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(tick);
      void savePosition();
      logSession();
    };
  });

  // ---- touch/click zones: left third back a sentence, center play/pause, right forward ----
  function onStageClick(e: MouseEvent) {
    const el = e.currentTarget as HTMLElement;
    const x = e.clientX - el.getBoundingClientRect().left;
    const third = el.clientWidth / 3;
    if (x < third) back();
    else if (x > third * 2) forward();
    else toggle();
  }

  // ---- display ----
  const fallback: TimelineWord = ['', 0, 1];
  const current = $derived(words[index] ?? fallback);
  const pre = $derived(current[0].slice(0, current[1]));
  const pivot = $derived(current[0].charAt(current[1]));
  const post = $derived(current[0].slice(current[1] + 1));

  // ORP-centred word fitting: shrink the font for words that would overflow.
  let stageW = $state(0);
  const basePx = $derived(stageW > 0 && stageW < 420 ? 30 : stageW < 560 ? 36 : 42);
  const fontPx = $derived.by(() => {
    if (stageW <= 0) return basePx;
    const halfChars = Math.max(pre.length, post.length) + 1;
    const maxPx = (stageW / 2 - 14) / (halfChars * 0.62); // mono glyph ≈ 0.62em wide
    return Math.max(14, Math.min(basePx, maxPx));
  });

  // tick ruler under the slider — instrument-panel flavour, majors at 100s
  const TICKS = Array.from({ length: (800 - 150) / 25 + 1 }, (_, i) => 150 + i * 25);

  const padLen = Math.max(3, String(total).length);
  const pad = (n: number) => String(n).padStart(padLen, '0');
  const counter = $derived(`${pad(total === 0 ? 0 : index + 1)} / ${pad(total)}`);
  const fillPct = $derived(total > 0 ? ((index + 1) / total) * 100 : 0);
</script>

<svelte:window onkeydown={onKey} />

<div class="wrap readerview">
  <div class="rhead">
    <button class="backbtn" type="button" onclick={exit}>← {t('library_link')}</button>
    <span class="btitle">{book.title}</span>
    <span class="counter">{counter}</span>
  </div>

  <section class="reader-panel" aria-label="Reader">
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <div class="stage" bind:clientWidth={stageW} onclick={onStageClick}>
      <div class="rail top"></div>
      <div class="rail bottom"></div>
      <div class="notch top"></div>
      <div class="notch bottom"></div>
      <div class="word" style="font-size: {fontPx}px">
        <span class="pre">{pre}</span><span class="orp">{pivot}</span><span class="post">{post}</span>
      </div>
    </div>

    <div class="progress"><div class="fill" style="width: {fillPct}%"></div></div>

    <div class="controls">
      <button class="btn" type="button" onclick={toggle}>
        {playing ? t('pause') : finished ? t('replay') : t('play')}
      </button>
      <div class="wpm-wrap">
        <div class="sliderbox">
          <input
            type="range"
            min="150"
            max="800"
            step="25"
            bind:value={wpm}
            aria-label="Words per minute"
          />
          <div class="wpmticks" aria-hidden="true">
            {#each TICKS as tick (tick)}
              <i class:maj={tick % 100 === 0} class:on={tick === wpm}></i>
            {/each}
          </div>
        </div>
        <div class="wpm-val"><b>{wpm}</b> wpm</div>
      </div>
    </div>

    <div class="rhint">
      <span class="kbd-only">{t('reader_hint_kbd')}</span>
      <span class="touch-only">{t('reader_hint_touch')}</span>
    </div>
  </section>
</div>
