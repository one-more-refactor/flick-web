<script lang="ts">
  // One landing stat: a 5×7 dot-matrix numeral (DotNumber) that counts up
  // ease-out on first scroll into view — rAF-driven, per the design brief
  // ("Counters count up ease-out 250–400ms on first paint"). Self-contained:
  // works without GSAP, and prefers-reduced-motion settles instantly.
  import { onMount } from 'svelte';
  import type { Snippet } from 'svelte';
  import DotNumber from '../DotNumber.svelte';

  let {
    value,
    unit = '',
    label = '',
    delay = 0,
    children,
  }: {
    value: number;
    unit?: string;
    label?: string;
    /** stagger offset in ms (grouped counters, 40–80ms apart) */
    delay?: number;
    /** optional rich sub-label (e.g. keycaps) — replaces `label` */
    children?: Snippet;
  } = $props();

  let shown = $state(0);
  let el: HTMLElement | undefined = $state();

  onMount(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || !('IntersectionObserver' in window)) {
      shown = value;
      return;
    }
    let raf = 0;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        const t0 = performance.now() + delay;
        const dur = 450;
        const step = (now: number) => {
          const t = Math.min(1, Math.max(0, (now - t0) / dur));
          shown = Math.round(value * (1 - (1 - t) * (1 - t))); // ease-out
          if (t < 1) raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
      },
      { threshold: 0.35 },
    );
    if (el) io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  });
</script>

<div class="sd" bind:this={el}>
  <div class="sd-n"><DotNumber value={shown} grid={7} /></div>
  {#if unit}<div class="sd-u">{unit}</div>{/if}
  <div class="sd-l">
    {#if children}{@render children()}{:else}{label}{/if}
  </div>
</div>

<style>
  .sd {
    text-align: center;
  }
  .sd-n {
    display: flex;
    justify-content: center;
    align-items: flex-end;
    min-height: 49px; /* 7 rows × grid 7 — no reflow while counting */
  }
  .sd-u {
    font-size: 9px;
    letter-spacing: 0.3em;
    text-transform: uppercase;
    color: var(--dim);
    margin-top: 10px;
  }
  .sd-l {
    font-size: 11px;
    color: var(--dim);
    letter-spacing: 0.03em;
    margin-top: 6px;
  }
</style>
