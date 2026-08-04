<script lang="ts">
  // The landing hero: an auto-running reader with no controls — the product
  // pitching itself. Plays a pre-computed flick-core timeline (demos.ts);
  // rAF accumulator, same discipline as the real reader.
  import { onMount } from 'svelte';
  import type { TimelineWord } from './api';

  let {
    words,
    wpm = 360,
    loopPauseMs = 1500,
    meter = false,
  }: {
    words: TimelineWord[];
    wpm?: number;
    loopPauseMs?: number;
    /** show the instrument telemetry row (word index + wpm) under the bar */
    meter?: boolean;
  } = $props();

  let index = $state(0);
  let raf = 0;
  let last = 0;
  let acc = 0;
  let holdUntil = 0;

  function duration(i: number): number {
    return words[i][2] * (60000 / wpm);
  }

  function frame(now: number) {
    if (holdUntil > 0) {
      if (now >= holdUntil) {
        holdUntil = 0;
        index = 0;
        acc = 0;
      }
      last = now;
      raf = requestAnimationFrame(frame);
      return;
    }
    acc += now - last;
    last = now;
    let dur = duration(index);
    while (acc >= dur) {
      acc -= dur;
      if (index + 1 >= words.length) {
        holdUntil = now + loopPauseMs;
        break;
      }
      index += 1;
      dur = duration(index);
    }
    raf = requestAnimationFrame(frame);
  }

  onMount(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      // a slow, settled slideshow instead of the full-speed stream
      index = 0;
      const iv = setInterval(() => (index = (index + 1) % words.length), 1400);
      return () => clearInterval(iv);
    }
    last = performance.now();
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  });

  const fallback: TimelineWord = ['', 0, 1];
  const current = $derived(words[index] ?? fallback);
  const pre = $derived(current[0].slice(0, current[1]));
  const pivot = $derived(current[0].charAt(current[1]));
  const post = $derived(current[0].slice(current[1] + 1));
  const pct = $derived(words.length > 0 ? ((index + 1) / words.length) * 100 : 0);
  const pad3 = (n: number) => String(n).padStart(3, '0');
</script>

<div class="hero-reader" aria-hidden="true">
  <div class="hrail"><i></i></div>
  <div class="hword">{pre}<span class="pv">{pivot}</span>{post}</div>
  <div class="hrail"><i></i></div>
  <div class="hprogress"><i style="width: {pct}%"></i></div>
  {#if meter}
    <div class="hmeter">
      <span>[ {pad3(index + 1)} / {pad3(words.length)} ]</span>
      <span><b>{wpm}</b> wpm</span>
    </div>
  {/if}
</div>

<style>
  /* instrument telemetry under the progress bar — quiet, tabular, tracked */
  .hmeter {
    display: flex;
    justify-content: space-between;
    max-width: 300px;
    margin: 8px auto 0;
    font-size: 10px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--dim);
    font-variant-numeric: tabular-nums;
  }
  .hmeter b {
    font-weight: 400;
    color: var(--ink);
  }
</style>
