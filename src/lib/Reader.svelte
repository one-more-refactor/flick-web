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
    ephemeral = false,
  }: {
    book: Book;
    timeline: Timeline;
    user: User;
    onExit: () => void;
    /** Reports WPM changes upward so the in-memory user stays in sync. */
    onWpm?: (wpm: number) => void;
    /** Read-only share: no position save, no session log, no library copy. */
    ephemeral?: boolean;
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

  // ---- reader customisation (v0.6, context v0.8): per-device, localStorage ----
  type ReaderPrefs = { font: 's' | 'm' | 'l' | 'xl'; guides: boolean; context: boolean };
  const PREFS_KEY = 'flick.reader';
  const FONT_MULT: Record<ReaderPrefs['font'], number> = { s: 0.85, m: 1, l: 1.18, xl: 1.4 };
  function loadPrefs(): ReaderPrefs {
    try {
      const raw = JSON.parse(localStorage.getItem(PREFS_KEY) ?? '');
      return {
        font: ['s', 'm', 'l', 'xl'].includes(raw.font) ? raw.font : 'm',
        guides: raw.guides !== false,
        context: raw.context === true,
      };
    } catch {
      return { font: 'm', guides: true, context: false };
    }
  }
  let prefs = $state<ReaderPrefs>(loadPrefs());
  $effect(() => {
    localStorage.setItem(PREFS_KEY, JSON.stringify($state.snapshot(prefs)));
  });
  let custOpen = $state(false);

  // ---- zen mode (v0.6): chrome fades, the word remains ----
  let zen = $state(false);

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
    // Clamp the frame delta: jank or a background tab must never fast-forward
    // the reader through words the eye never saw (consistency, engine v2).
    const delta = Math.min(now - last, 250);
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
    if (ephemeral) return; // read-only share: nothing to persist
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
    if (ephemeral) return; // read-only share: not part of anyone's stats
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

  /** Last word (inclusive) of the sentence containing `from`. */
  function sentenceEnd(from: number): number {
    let j = from;
    while (j < total && !isBoundary(j)) j += 1;
    return Math.min(j, total - 1);
  }

  // ---- context/sentence view (v0.8): the live word set in its sentence, so
  // the eye keeps its place. Bounded around the active word so a very long
  // sentence still fits and the current word is always shown.
  const CTX_SPAN = 16;
  const ctxWindow = $derived.by(() => {
    if (!prefs.context) return [] as { i: number; text: string }[];
    const s = Math.max(sentenceStart(index), index - CTX_SPAN);
    const e = Math.min(sentenceEnd(index), index + CTX_SPAN);
    const out: { i: number; text: string }[] = [];
    for (let i = s; i <= e; i++) out.push({ i, text: words[i]?.[0] ?? '' });
    return out;
  });

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
        if (custOpen) custOpen = false;
        else if (zen) zen = false;
        else exit();
        break;
      case 'z':
      case 'Z':
        if (onSlider) return;
        e.preventDefault();
        zen = !zen;
        break;
    }
  }

  function onWindowClick(e: MouseEvent) {
    if (custOpen && !(e.target as Element | null)?.closest('.custwrap')) custOpen = false;
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
    const scaled = basePx * FONT_MULT[prefs.font];
    if (stageW <= 0) return scaled;
    const halfChars = Math.max(pre.length, post.length) + 1;
    const maxPx = (stageW / 2 - 14) / (halfChars * 0.62); // mono glyph ≈ 0.62em wide
    return Math.max(14, Math.min(scaled, maxPx));
  });

  // tick ruler under the slider — instrument-panel flavour, majors at 100s
  const TICKS = Array.from({ length: (800 - 150) / 25 + 1 }, (_, i) => 150 + i * 25);

  // ---- progress scrubber (v0.6): click/drag to navigate the text ----
  let scrubbing = $state(false);
  let scrubEl: HTMLDivElement | undefined = $state();

  function scrubTo(e: PointerEvent) {
    if (!scrubEl) return;
    const rect = scrubEl.getBoundingClientRect();
    const frac = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    seek(Math.round(frac * (total - 1)));
  }

  function scrubStart(e: PointerEvent) {
    scrubbing = true;
    scrubEl?.setPointerCapture(e.pointerId);
    scrubTo(e);
  }

  function scrubMove(e: PointerEvent) {
    if (scrubbing) scrubTo(e);
  }

  function scrubEnd() {
    if (!scrubbing) return;
    scrubbing = false;
    void savePosition();
  }

  const minsAt = $derived(Math.max(0, Math.round((total - index) / Math.max(100, wpm))));

  // ---- slider wave (v0.6): ticks lift around the thumb while sliding ----
  let sliding = $state(false);
  function tickScale(tick: number): number {
    if (!sliding) return 1;
    const center = (wpm - 150) / 650;
    const pos = (tick - 150) / 650;
    const d = Math.abs(pos - center);
    const near = Math.max(0, 1 - d * 7);
    return 1 + 1.5 * near * near;
  }

  const padLen = Math.max(3, String(total).length);
  const pad = (n: number) => String(n).padStart(padLen, '0');
  const counter = $derived(`${pad(total === 0 ? 0 : index + 1)} / ${pad(total)}`);
  const fillPct = $derived(total > 0 ? ((index + 1) / total) * 100 : 0);
</script>

<svelte:window
  onkeydown={onKey}
  onclick={onWindowClick}
  onpagehide={() => void savePosition()}
/>
<svelte:document
  onvisibilitychange={() => {
    // A hidden tab pauses cleanly instead of silently burning words.
    if (document.hidden) pause();
  }}
/>

<div class="wrap readerview" class:zen>
  <div class="rhead">
    <button class="backbtn" type="button" onclick={exit}>← {t('library_link')}</button>
    <span class="btitle">{book.title}{#if ephemeral}<i class="robadge">{t('share_read_opt')}</i>{/if}</span>
    <button class="zenbtn" type="button" onclick={() => (zen = !zen)} title="zen [z]">
      {t('zen_k')}_
    </button>
    <span class="counter">{counter}</span>
  </div>
  {#if zen}
    <button class="zenexit" type="button" onclick={() => (zen = false)} aria-label="exit zen">
      ×
    </button>
  {/if}

  <section class="reader-panel" aria-label="Reader">
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <div class="stage" bind:clientWidth={stageW} onclick={onStageClick}>
      {#if prefs.guides}
        <div class="rail top"></div>
        <div class="rail bottom"></div>
        <div class="notch top"></div>
        <div class="notch bottom"></div>
      {/if}
      <div class="word" style="font-size: {fontPx}px">
        <span class="pre">{pre}</span><span class="orp">{pivot}</span><span class="post">{post}</span>
      </div>
    </div>

    {#if ctxWindow.length > 0}
      <div class="context" aria-hidden="true">
        {#each ctxWindow as w (w.i)}
          <button
            class="cw"
            class:on={w.i === index}
            type="button"
            tabindex="-1"
            onclick={() => seek(w.i)}>{w.text}</button>
        {/each}
      </div>
    {/if}

    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="progress scrub"
      class:scrubbing
      bind:this={scrubEl}
      onpointerdown={scrubStart}
      onpointermove={scrubMove}
      onpointerup={scrubEnd}
      onpointercancel={scrubEnd}
    >
      <div class="fill" style="width: {fillPct}%"></div>
      {#if scrubbing}
        <div class="scrubtip" style="left: {fillPct}%">
          {Math.round(fillPct)}% · ~{minsAt} {t('min')}
        </div>
      {/if}
    </div>

    <div class="controls">
      <button
        class="btn playbtn"
        type="button"
        onclick={toggle}
        aria-label={playing ? t('pause') : finished ? t('replay') : t('play')}
      >
        <span class="picon" class:playing class:finished>
          <svg class="i-play" viewBox="0 0 24 24" aria-hidden="true">
            <polygon points="6,4 20,12 6,20" />
          </svg>
          <svg class="i-pause" viewBox="0 0 24 24" aria-hidden="true">
            <rect x="6" y="4" width="4" height="16" />
            <rect x="14" y="4" width="4" height="16" />
          </svg>
          <svg class="i-replay" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 5V1L6 6l6 5V7a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8z" />
          </svg>
        </span>
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
            onpointerdown={() => (sliding = true)}
            onpointerup={() => (sliding = false)}
            onpointercancel={() => (sliding = false)}
            onblur={() => (sliding = false)}
          />
          <div class="wpmticks" aria-hidden="true">
            {#each TICKS as tick (tick)}
              <i
                class:maj={tick % 100 === 0}
                class:on={tick === wpm}
                style="--s:{tickScale(tick)}"
              ></i>
            {/each}
          </div>
        </div>
        <div class="wpm-val">
          {#key wpm}<b class="popnum">{wpm}</b>{/key} wpm
        </div>
      </div>
      <div class="custwrap">
        <button
          class="custbtn"
          type="button"
          onclick={() => (custOpen = !custOpen)}
          aria-expanded={custOpen}
          title={t('font_k')}
        >Aa</button>
        {#if custOpen}
          <div class="custpanel">
            <div class="crow">
              <span class="ck">{t('font_k')}</span>
              {#each ['s', 'm', 'l', 'xl'] as f (f)}
                <button
                  class="cchip"
                  class:on={prefs.font === f}
                  type="button"
                  onclick={() => (prefs.font = f as 's' | 'm' | 'l' | 'xl')}
                >{f.toUpperCase()}</button>
              {/each}
            </div>
            <div class="crow">
              <span class="ck">{t('guides_k')}</span>
              <button
                class="cchip"
                class:on={prefs.guides}
                type="button"
                onclick={() => (prefs.guides = !prefs.guides)}
              >{prefs.guides ? 'ON' : 'OFF'}</button>
            </div>
            <div class="crow">
              <span class="ck">{t('ctx_k')}</span>
              <button
                class="cchip"
                class:on={prefs.context}
                type="button"
                onclick={() => (prefs.context = !prefs.context)}
              >{prefs.context ? 'ON' : 'OFF'}</button>
            </div>
            <div class="crow">
              <span class="ck">{t('zen_k')}</span>
              <button
                class="cchip"
                class:on={zen}
                type="button"
                onclick={() => {
                  zen = !zen;
                  custOpen = false;
                }}
              >{zen ? 'ON' : 'OFF'} <i>[z]</i></button>
            </div>
          </div>
        {/if}
      </div>
    </div>

    <div class="rhint">
      <span class="kbd-only">{t('reader_hint_kbd')}</span>
      <span class="touch-only">{t('reader_hint_touch')}</span>
    </div>
  </section>
</div>
