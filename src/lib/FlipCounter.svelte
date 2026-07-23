<script lang="ts">
  import FlipDigit from './FlipDigit.svelte';

  // A physical split-flap counter — one flap per digit. Used for hero numbers
  // that change in place (the day streak), replacing the dot-matrix that read
  // as a broken glyph at small sizes.
  let { value, size = 30 }: { value: number | string; size?: number } = $props();

  const digits = $derived([...String(value)]);
</script>

<span class="flipc" style="--fh: {size}px" role="img" aria-label={String(value)}>
  {#each digits as d, i (i)}
    <FlipDigit {d} />
  {/each}
</span>

<style>
  .flipc {
    display: inline-flex;
    gap: 3px;
    align-items: stretch;
    vertical-align: middle;
  }
</style>
