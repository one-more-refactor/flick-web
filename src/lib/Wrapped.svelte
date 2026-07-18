<script lang="ts">
  // The yearly breakdown (contract v0.7, route /wrapped) — Spotify-Wrapped
  // flavour, flick language: dot-matrix numbers, staggered tiles.
  import * as api from './api';
  import type { Wrapped } from './api';
  import { t, i18n } from './i18n.svelte';
  import DotNumber from './DotNumber.svelte';

  let { onBack }: { onBack: () => void } = $props();

  let data = $state<Wrapped | null>(null);
  let error = $state<string | null>(null);

  api
    .wrapped()
    .then((w) => (data = w))
    .catch((e) => (error = e instanceof Error ? e.message : t('err_generic')));

  const locale = $derived(
    i18n.resolved === 'de' ? 'de-DE' : i18n.resolved === 'es' ? 'es-ES' : 'en-US',
  );

  function monthName(m: number): string {
    return new Date(2026, m - 1, 15).toLocaleDateString(locale, { month: 'long' });
  }

  function weekdayName(d: number): string {
    // top_weekday: 0 = Monday (epoch-day arithmetic, ISO)
    return new Date(2026, 5, 1 + d).toLocaleDateString(locale, { weekday: 'long' });
  }

  function fmtTime(ms: number): string {
    const m = Math.round(ms / 60_000);
    return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
  }

  const num = (n: number) => n.toLocaleString();
</script>

<div class="wrap wrappedview">
  <div class="head">
    <button class="backbtn" type="button" onclick={onBack}>← {t('library_link')}</button>
    <span class="cap">WRAPPED_</span>
  </div>

  {#if error}
    <div class="status err">{error}</div>
  {:else if !data}
    <div class="status">{t('loading')}<span class="cur">_</span></div>
  {:else}
    <div class="wrhero fadeup">
      <span class="wryear"><DotNumber value={data.year} grid={6} /></span>
      <p class="wrsub">{t('wr_title')}</p>
    </div>

    {#if data.total_words === 0}
      <div class="status">{t('wr_none')}</div>
    {:else}
      <div class="wrbig" style="--i:0">
        <div class="wrnum">{num(data.total_words)}</div>
        <div class="lab">{t('words_read_k')}</div>
      </div>

      <div class="tiles">
        <div class="tile" style="--i:1">
          <div class="tv">{data.best_streak}</div>
          <div class="lab">{t('best_k')} {t('day_streak_k')}</div>
        </div>
        <div class="tile" style="--i:2">
          <div class="tv">{data.active_days}</div>
          <div class="lab">{t('active_days_k')}</div>
        </div>
        <div class="tile" style="--i:3">
          <div class="tv">{fmtTime(data.time_ms)}</div>
          <div class="lab">{t('time_read_k')}</div>
        </div>
        <div class="tile" style="--i:4">
          <div class="tv">{data.avg_wpm > 0 ? data.avg_wpm : '—'}</div>
          <div class="lab">{t('avg_wpm_k')}</div>
        </div>
        <div class="tile" style="--i:5">
          <div class="tv">{data.books_finished}</div>
          <div class="lab">{t('books_done_k')}</div>
        </div>
        <div class="tile" style="--i:6">
          <div class="tv">{data.sessions}</div>
          <div class="lab">{t('sessions_k')}</div>
        </div>
        {#if data.best_day}
          <div class="tile" style="--i:7">
            <div class="tv">
              {num(data.best_day.words)}
              <span class="td">{data.best_day.day}</span>
            </div>
            <div class="lab">{t('best_day_k')}</div>
          </div>
        {/if}
        {#if data.top_month !== null}
          <div class="tile" style="--i:8">
            <div class="tv">{monthName(data.top_month)}</div>
            <div class="lab">{t('wr_month')}</div>
          </div>
        {/if}
        {#if data.top_weekday !== null}
          <div class="tile" style="--i:9">
            <div class="tv">{weekdayName(data.top_weekday)}</div>
            <div class="lab">{t('wr_weekday')}</div>
          </div>
        {/if}
      </div>
    {/if}
  {/if}
</div>
