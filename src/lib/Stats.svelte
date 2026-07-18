<script lang="ts">
  // Running-app-style stats: streak, today vs goal, 6-week chart, sessions.
  import * as api from './api';
  import type { ReadingSession, Stats } from './api';
  import { t, i18n } from './i18n.svelte';
  import DotNumber from './DotNumber.svelte';

  let { onBack, onWrapped }: { onBack: () => void; onWrapped?: () => void } = $props();

  let stats = $state<Stats | null>(null);
  let sessions = $state<ReadingSession[]>([]);
  let error = $state<string | null>(null);

  // ---- friends scoreboard (contract v0.7: aggregates only) ----
  let rows = $state<api.FriendRow[]>([]);
  let myLink = $state<string | null>(null);
  let addCode = $state('');
  let copied = $state(false);
  let socialErr = $state<string | null>(null);

  function loadSocial() {
    api
      .friends()
      .then((r) => (rows = [...r].sort((a, b) => b.week_words - a.week_words)))
      .catch(() => {});
    api.friendLink().then((l) => (myLink = l.path)).catch(() => {});
  }
  loadSocial();

  async function addFriend() {
    const code = addCode.trim();
    if (!code) return;
    socialErr = null;
    try {
      await api.friendAdd(code.replace(/^.*\/f\//, ''));
      addCode = '';
      loadSocial();
    } catch (e) {
      socialErr = e instanceof Error ? e.message : t('err_generic');
    }
  }

  async function unfriend(id: string) {
    try {
      await api.friendRemove(id);
      loadSocial();
    } catch {
      // row refresh will tell the truth
    }
  }

  async function copyLink() {
    if (!myLink) return;
    try {
      await navigator.clipboard.writeText(`${location.origin}${myLink}`);
      copied = true;
      setTimeout(() => (copied = false), 1600);
    } catch {
      // link stays visible
    }
  }

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

  /** "3h 12m" / "42m" — lifetime reading time. */
  function fmtTime(ms: number): string {
    const m = Math.round(ms / 60_000);
    return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
  }

  function shortDay(day: string): string {
    const d = new Date(`${day}T12:00:00`);
    return d.toLocaleDateString(i18n.resolved === 'de' ? 'de-DE' : 'en-US', {
      day: '2-digit',
      month: 'short',
    });
  }

  /** Tiles for the lifetime aggregates (v0.4.2 "real stats"). */
  const tiles = $derived.by(() => {
    const tt = stats?.totals;
    if (!tt) return [] as { k: string; v: string; d?: string }[];
    const out: { k: string; v: string; d?: string }[] = [
      { k: t('time_read_k'), v: fmtTime(tt.time_ms) },
      { k: t('avg_wpm_k'), v: tt.avg_wpm > 0 ? String(tt.avg_wpm) : '—' },
      { k: t('books_done_k'), v: String(tt.books_finished) },
      { k: t('active_days_k'), v: String(tt.active_days) },
      { k: t('sessions_k'), v: String(tt.sessions) },
    ];
    if (tt.best_day) {
      out.push({ k: t('best_day_k'), v: num(tt.best_day.words), d: shortDay(tt.best_day.day) });
    }
    return out;
  });
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

    {#if tiles.length > 0}
      <div class="tiles">
        {#each tiles as tile, i (tile.k)}
          <div class="tile" style="--i:{i}">
            <div class="tv">{tile.v}{#if tile.d}<span class="td">{tile.d}</span>{/if}</div>
            <div class="lab">{tile.k}</div>
          </div>
        {/each}
      </div>
    {/if}

    <div class="goalcap">
      <span>{t('today_k')} — {num(stats.today.words)} / {num(stats.goal)} {t('words')}</span>
      <b>{goalPct}%</b>
    </div>
    <div class="goalbar"><i style="width: {goalPct}%"></i></div>

    <div class="dayschart" role="img" aria-label={t('last_days')}>
      {#each chart as c, i (c.day)}
        <div
          class="bar"
          class:hit={c.words >= stats.goal}
          style="height: {Math.max(3, (c.words / chartMax) * 100)}%; --i:{i}"
          title="{c.day} · {num(c.words)}"
        ></div>
      {/each}
    </div>
    <div class="chartcap">{t('last_days')} · {t('goal_k')} {num(stats.goal)}</div>

    <div class="frsec">
      <div class="listcap"><span class="cap">{t('fr_k')}</span><i></i>
        {#if onWrapped}
          <button class="linklike" type="button" onclick={onWrapped}>WRAPPED_ →</button>
        {/if}
      </div>
      {#if rows.length <= 1}
        <div class="empty" style="padding: 18px 0">{t('fr_none')}</div>
      {:else}
        <div class="frboard">
          {#each rows as r, i (r.id)}
            <div class="frrow" class:me={r.me}>
              <span class="frrank">{String(i + 1).padStart(2, '0')}</span>
              <span class="frname">{r.me ? `@${r.name}` : r.name}</span>
              <span class="frn"><b>{r.week_words.toLocaleString()}</b> {t('fr_week')}</span>
              <span class="frn">{r.streak} ▮</span>
              {#if !r.me}
                <button
                  class="linklike"
                  type="button"
                  title={t('unfriend')}
                  onclick={() => unfriend(r.id)}
                >×</button>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
      <div class="fradd">
        <input
          class="taginput"
          type="text"
          bind:value={addCode}
          placeholder={t('fr_add_ph')}
          onkeydown={(e) => e.key === 'Enter' && addFriend()}
        />
        <button class="btn ghost" type="button" onclick={addFriend}>{t('fr_add')} →</button>
        {#if myLink}
          <button class="linklike" type="button" onclick={copyLink}>
            {copied ? `✓ ${t('link_copied')}` : `${t('fr_link')} →`}
          </button>
        {/if}
      </div>
      {#if socialErr}<div class="status err">{socialErr}</div>{/if}
      <div class="frnote">{t('fr_privacy')}</div>
    </div>

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
