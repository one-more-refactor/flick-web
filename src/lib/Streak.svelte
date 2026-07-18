<script lang="ts">
  // Streak celebration (contract v0.4.2): a real reward — accent flash,
  // count-up on the dot-matrix number, flat square confetti. Still
  // skippable from frame 0 and self-dismissing well under 4s.
  import { onMount } from 'svelte';
  import { t } from './i18n.svelte';
  import DotNumber from './DotNumber.svelte';

  let { days, onDone }: { days: number; onDone: () => void } = $props();

  // Count up the last few days for a ticking, earned feel.
  // svelte-ignore state_referenced_locally
  let shown = $state(Math.max(1, days - 3));

  // Flat square confetti: accent / ink / dim squares bursting from center.
  const COLORS = ['var(--accent)', 'var(--ink)', 'var(--dim)'];
  const confetti = Array.from({ length: 26 }, (_, i) => {
    const angle = (i / 26) * Math.PI * 2 + Math.random() * 0.6;
    const dist = 90 + Math.random() * 150;
    return {
      dx: `${Math.round(Math.cos(angle) * dist)}px`,
      dy: `${Math.round(Math.sin(angle) * dist * 0.75 - 30)}px`,
      rot: `${Math.round(Math.random() * 720 - 360)}deg`,
      delay: `${Math.round(Math.random() * 180)}ms`,
      size: `${5 + Math.round(Math.random() * 6)}px`,
      color: COLORS[i % COLORS.length],
    };
  });

  onMount(() => {
    const tick = setInterval(() => {
      if (shown < days) shown += 1;
      else clearInterval(tick);
    }, 240);
    const timer = setTimeout(onDone, 3800);
    return () => {
      clearInterval(tick);
      clearTimeout(timer);
    };
  });

  function onKey(e: KeyboardEvent) {
    e.preventDefault();
    onDone();
  }
</script>

<svelte:window onkeydown={onKey} />

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions, a11y_no_noninteractive_element_interactions -->
<div class="streaklay" onclick={onDone} role="status">
  <div class="flash" aria-hidden="true"></div>
  <div class="burst" aria-hidden="true">
    {#each confetti as c, i (i)}
      <i
        style="--dx:{c.dx}; --dy:{c.dy}; --rot:{c.rot}; --delay:{c.delay}; --size:{c.size}; --col:{c.color}"
      ></i>
    {/each}
  </div>
  <div class="dmwrap pop">
    <DotNumber value={shown} grid={12} />
  </div>
  <div class="slab stretch">{t('streak_kept')} — {shown} {shown === 1 ? t('day') : t('days')}</div>
  <div class="stap">{t('tap_to_continue')}</div>
</div>
