<script lang="ts">
  // Streak celebration: full-screen, glyph-sequence style, skippable from
  // frame 0, self-dismissing well under 4s (DESIGN-BRIEF choreography).
  import { onMount } from 'svelte';
  import { t } from './i18n.svelte';
  import DotNumber from './DotNumber.svelte';

  let { days, onDone }: { days: number; onDone: () => void } = $props();

  let timer: ReturnType<typeof setTimeout>;
  onMount(() => {
    timer = setTimeout(onDone, 3600);
    return () => clearTimeout(timer);
  });

  function onKey(e: KeyboardEvent) {
    e.preventDefault();
    onDone();
  }
</script>

<svelte:window onkeydown={onKey} />

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions, a11y_no_noninteractive_element_interactions -->
<div class="streaklay" onclick={onDone} role="status">
  <div class="dmwrap">
    <DotNumber value={days} grid={12} />
  </div>
  <div class="slab">{t('streak_kept')} — {days} {days === 1 ? t('day') : t('days')}</div>
  <div class="stap">{t('tap_to_continue')}</div>
</div>
