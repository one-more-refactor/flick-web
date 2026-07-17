<script lang="ts">
  // Running-app-style stats: streak, today vs goal, 6-week chart, sessions.
  import * as api from './api';
  import type { ReadingSession, Stats } from './api';
  import { t, i18n } from './i18n.svelte';
  import DotNumber from './DotNumber.svelte';

  let { onBack }: { onBack: () => void } = $props();

  let stats = $state<Stats | null>(null);
  let sessions = $state<ReadingSession[]>([]);
  let error = $state<string | null>(null);

  api.stats().then((s) => (stats = s)).catch((e) => (error = e instanceof Error ? e.message : t('err_generic')));
  api.sessions().then((s) => (sessions = s)).catch(() => {});

  const num = (n: number) => n.toLocaleString();

  /** The last 42 calendar days, zero-filled from the sparse server list. */
  const chart = $derived.by(() => {
    if (!stats) return [] as { day: string; words: number }[];
    const byDay = new Map(stats.days.map((d) => [d.day, d.words]));
    const out: { day: string; words: number }[] = [];
    const d = new Date();
    d.setDate(d.getDate() - 41);
    for (let i = 0; i < 42; i++) {
      const key = api.localDay(d);
      out.push({ day: key, words: byDay.get(key) ?? 0 });
      d.setDate(d.getDate() + 1);
    }
    return out;
  });
  const chartMax = $derived(Math.max(1, ...chart.map((c) => c.words)));

  const goalPct = $derived(
    stats ? Math.min(100, Math.round((stats.today.words / stats.goal) * 100)) : 0,
  );

  function when(s: ReadingSession): string {
    const d = new Date(s.started_at * 1000);
    return d.toLocaleDateString(i18n.resolved === 'de' ? 'de-DE' : 'en-US', {
      day: '2-digit',
      month: 'short',
    });
  }

  const minutes = (ms: number) => Math.max(1, Math.round(ms / 60_000));
</script>

<div class="wrap statsview">
  <div class="head">
    <button class="backbtn" type="button" onclick={onBack}>← {t('library_link')}</button>
    <span class="cap">{t('stats_title').toUpperCase()}</span>
  </div>

  {#if error}
    <div class="status err">{error}</div>
  {:else if !stats}
    <div class="status">{t('loading')}<span class="cur">_</span></div>
  {:else}
    <div class="bigstats fadeup">
      <div class="stat">
        <DotNumber value={stats.streak.current} grid={7} />
        <div class="lab">{t('day_streak_k')}</div>
      </div>
      <div class="stat">
        <div class="plain">{stats.streak.best}</div>
        <div class="lab">{t('best_k')}</div>
      </div>
      <div class="stat">
        <div class="plain">{num(stats.total_words)}</div>
        <div class="lab">{t('total_k')}</div>
      </div>
    </div>

    <div class="goalcap">
      <span>{t('today_k')} — {num(stats.today.words)} / {num(stats.goal)} {t('words')}</span>
      <b>{goalPct}%</b>
    </div>
    <div class="goalbar"><i style="width: {goalPct}%"></i></div>

    <div class="dayschart" role="img" aria-label={t('last_days')}>
      {#each chart as c (c.day)}
        <div
          class="bar"
          class:hit={c.words >= stats.goal}
          style="height: {Math.max(3, (c.words / chartMax) * 100)}%"
          title="{c.day} · {num(c.words)}"
        ></div>
      {/each}
    </div>
    <div class="chartcap">{t('last_days')} · {t('goal_k')} {num(stats.goal)}</div>

    <div class="sesslist">
      {#if sessions.length === 0}
        <div class="empty">{t('no_sessions')}</div>
      {:else}
        {#each sessions as s (s.id)}
          <div class="sess">
            <span class="when">{when(s)}</span>
            <span class="bt">{s.book_title}</span>
            <span class="n">{minutes(s.duration_ms)} {t('min')} · {num(s.words)} · <b>{s.avg_wpm} wpm</b></span>
          </div>
        {/each}
      {/if}
    </div>
  {/if}
</div>
