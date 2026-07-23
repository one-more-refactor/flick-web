<script lang="ts">
  import { untrack } from 'svelte';

  // One split-flap digit. Two static halves show the settled glyph; on a
  // change the old top folds down while the new bottom unfolds up — the
  // departure-board flip. Pure rotateX (flick's cube vocabulary), flat faces.
  let { d }: { d: string } = $props();

  // snapshot the initial glyph; subsequent changes are handled by the effect
  let shown = $state(untrack(() => d)); // the settled glyph (top + bottom at rest)
  let prev = $state(untrack(() => d)); // the glyph we're flipping away from
  let flipping = $state(false);
  let seq = $state(0); // bumps to restart the CSS animation on each change
  let timer: ReturnType<typeof setTimeout>;

  $effect(() => {
    const next = d;
    if (next !== untrack(() => shown)) {
      untrack(() => {
        prev = shown;
        shown = next;
        flipping = true;
        seq += 1;
        clearTimeout(timer);
        timer = setTimeout(() => (flipping = false), 620);
      });
    }
  });
</script>

<span class="fd">
  <!-- static: top is always the new glyph; bottom holds the old until the
       flap has covered it, then settles to the new one -->
  <span class="fh up"><b class="g">{shown}</b></span>
  <span class="fh lo"><b class="g">{flipping ? prev : shown}</b></span>
  {#if flipping}
    {#key seq}
      <span class="fh up flap ftop"><b class="g">{prev}</b></span>
      <span class="fh lo flap fbot"><b class="g">{shown}</b></span>
    {/key}
  {/if}
</span>

<style>
  /* --fh: full digit height, set by the parent counter. */
  .fd {
    position: relative;
    display: inline-block;
    width: calc(var(--fh) * 0.68);
    height: var(--fh);
    perspective: 180px;
  }
  .fh {
    position: absolute;
    left: 0;
    width: 100%;
    height: calc(var(--fh) / 2);
    overflow: hidden;
    background: var(--ink);
    color: var(--bg);
  }
  .up {
    top: 0;
    border-bottom: 1px solid color-mix(in srgb, var(--bg) 22%, transparent);
    border-radius: 2px 2px 0 0;
  }
  .lo {
    bottom: 0;
    border-radius: 0 0 2px 2px;
  }
  /* the glyph is a full-height line clipped by each half window */
  .g {
    position: absolute;
    left: 0;
    width: 100%;
    height: var(--fh);
    line-height: var(--fh);
    text-align: center;
    font-size: calc(var(--fh) * 0.62);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0;
  }
  .up .g { top: 0; }
  .lo .g { bottom: 0; }

  .flap { margin: 0; }
  .ftop {
    transform-origin: bottom;
    backface-visibility: hidden;
    animation: foldDown 0.31s cubic-bezier(0.36, 0, 0.66, 0.3) forwards;
  }
  .fbot {
    transform-origin: top;
    backface-visibility: hidden;
    transform: rotateX(90deg);
    animation: unfold 0.31s cubic-bezier(0.34, 0.7, 0.64, 1) 0.31s forwards;
  }
  @keyframes foldDown {
    from { transform: rotateX(0deg); }
    to { transform: rotateX(-90deg); }
  }
  @keyframes unfold {
    from { transform: rotateX(90deg); }
    to { transform: rotateX(0deg); }
  }
  @media (prefers-reduced-motion: reduce) {
    /* no fold — the settled glyph is already correct on both halves */
    .flap { display: none; }
  }
</style>
