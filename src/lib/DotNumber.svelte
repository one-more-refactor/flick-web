<script lang="ts">
  // A number rendered as 5×7 dot-matrix digits (hero numbers per the design
  // brief). Non-digit characters fall back to plain text.
  import { digitDots, digitSize } from './dotmatrix';

  let { value, grid = 5.2 }: { value: number | string; grid?: number } = $props();

  const chars = $derived([...String(value)]);
  const size = $derived(digitSize(grid));
</script>

<span class="dm" role="img" aria-label={String(value)}>
  {#each chars as ch, i (i)}
    {@const dots = digitDots(ch, grid)}
    {#if dots}
      <svg width={size.w} height={size.h} aria-hidden="true">
        {#each dots as d, j (j)}
          <circle cx={d.cx} cy={d.cy} r={grid * 0.365} class:on={d.on} />
        {/each}
      </svg>
    {:else}
      <span class="sep">{ch}</span>
    {/if}
  {/each}
</span>

<style>
  .dm { display: inline-flex; gap: 5px; align-items: center; }
  circle { fill: var(--line); transition: fill var(--t-flick); }
  circle.on { fill: var(--accent); }
  .sep { font-weight: 700; color: var(--dim); }
</style>
