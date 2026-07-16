<script lang="ts">
  import { onMount } from 'svelte';
  import * as api from './api';
  import type { Book, Timeline, TimelineWord } from './api';

  let {
    book,
    timeline,
    onExit,
  }: {
    book: Book;
    timeline: Timeline;
    onExit: () => void;
  } = $props();

  // The reader is mounted fresh per book (App keys the view), so capturing the
  // initial `book`/`timeline` values here is intentional.
  // svelte-ignore state_referenced_locally
  const words = timeline.words;
  const total = words.length;

  const WPM_KEY = 'flick.wpm';
  function loadWpm(): number {
    const raw = Number(localStorage.getItem(WPM_KEY));
    if (!Number.isFinite(raw)) return 350;
    return Math.min(800, Math.max(150, Math.round(raw / 25) * 25));
  }

  // resume from server-side position; a finished book restarts from the top
  // svelte-ignore state_referenced_locally
  let index = $state(book.position >= total ? 0 : Math.max(0, book.position));
  let playing = $state(false);
  let finished = $state(false);
  let wpm = $state(loadWpm());

  $effect(() => {
    localStorage.setItem(WPM_KEY, String(wpm));
  });

  // ---- vsync-locked scheduler (per CONTRACTS.md: rAF accumulator, never setTimeout) ----
  // Each frame adds its delta to `acc`; while `acc` covers the current word's
  // duration (weight * 60000/wpm) we advance and subtract, carrying the
  // remainder so pacing stays exact on 60/90/120 Hz displays. `duration` reads
  // `wpm` live, so WPM changes apply immediately without touching `acc`.
  let raf = 0;
  let last = 0;
  let acc = 0;

  function duration(i: number): number {
    return words[i][2] * (60000 / wpm);
  }

  function frame(now: number) {
    acc += now - last;
    last = now;
    let dur = duration(index);
    while (acc >= dur) {
      acc -= dur;
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

  // ---- position sync: every 5s while playing, on pause, on exit ----
  // svelte-ignore state_referenced_locally
  let lastSent = book.position;

  async function savePosition() {
    const pos = finished ? total : index;
    if (pos === lastSent) return;
    lastSent = pos;
    try {
      await api.savePosition(book.id, pos);
    } catch {
      lastSent = -1; // retry on the next save
    }
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
    // mid-sentence → snap to its start; at its start → previous sentence
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
    onExit();
  }

  function onKey(e: KeyboardEvent) {
    const t = e.target as HTMLElement | null;
    const onSlider = !!t && t.tagName === 'INPUT';
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
    };
  });

  // ---- display ----
  const fallback: TimelineWord = ['', 0, 1];
  const current = $derived(words[index] ?? fallback);
  const pre = $derived(current[0].slice(0, current[1]));
  const pivot = $derived(current[0].charAt(current[1]));
  const post = $derived(current[0].slice(current[1] + 1));

  const padLen = Math.max(3, String(total).length);
  const pad = (n: number) => String(n).padStart(padLen, '0');
  const counter = $derived(`${pad(total === 0 ? 0 : index + 1)} / ${pad(total)}`);
  const fillPct = $derived(total > 0 ? ((index + 1) / total) * 100 : 0);
</script>

<svelte:window onkeydown={onKey} />

<section class="panel" aria-label="Reader">
  <div class="panel-label">
    <span class="lbl">Reader · {book.title}</span>
    <span class="counter">{counter}</span>
  </div>

  <div class="stage">
    <div class="rail top"></div>
    <div class="rail bottom"></div>
    <div class="notch top"></div>
    <div class="notch bottom"></div>
    <div class="word">
      <span class="pre">{pre}</span><span class="orp">{pivot}</span><span class="post">{post}</span>
    </div>
  </div>

  <div class="progress"><div class="fill" style="width: {fillPct}%"></div></div>

  <div class="controls">
    <button class="btn" onclick={toggle}>
      {playing ? 'Pause' : finished ? 'Replay' : 'Play'}
    </button>
    <div class="wpm-wrap">
      <input type="range" min="150" max="800" step="25" bind:value={wpm} aria-label="Words per minute" />
      <div class="wpm-val"><b>{wpm}</b> wpm</div>
    </div>
  </div>

  <div class="hint">
    <span><b>space</b> play/pause · <b>←→</b> sentence · <b>esc</b> library</span>
  </div>
</section>
