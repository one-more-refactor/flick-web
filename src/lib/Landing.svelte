<script lang="ts">
  // The landing (guest door). Brand does the talking: the hero reader runs on
  // its own, one CTA, no captions, no feature bullets. Hidden once signed in.
  import * as api from './api';
  import type { CatalogEntry } from './api';
  import { t, i18n } from './i18n.svelte';
  import { AUTH_DEMO_WORDS } from './demos';
  import HeroReader from './HeroReader.svelte';

  let {
    onStart,
    onLogin,
    onPick,
    starting = false,
  }: {
    onStart: () => void;
    onLogin: () => void;
    onPick: (slug: string) => void;
    starting?: boolean;
  } = $props();

  let picks = $state<CatalogEntry[]>([]);
  let picking = $state<string | null>(null);

  // three shelf picks, preferring the reader's language
  api
    .catalog()
    .then((all) => {
      const lang = i18n.resolved;
      const sorted = [...all].sort((a, b) => Number(b.lang === lang) - Number(a.lang === lang));
      picks = [
        ...sorted.filter((e) => e.kind === 'story').slice(0, 2),
        ...sorted.filter((e) => e.kind !== 'story').slice(0, 1),
      ].slice(0, 3);
      if (picks.length < 3) picks = sorted.slice(0, 3);
    })
    .catch(() => {
      // shelf strip simply stays hidden
    });

  const mins = (w: number) => Math.max(1, Math.round(w / 400));

  function pick(slug: string) {
    if (picking) return;
    picking = slug;
    onPick(slug);
  }
</script>

<section class="hero">
  <div class="wrap">
    <p class="eyebrow">read it in a <b>flick</b></p>

    <HeroReader words={AUTH_DEMO_WORDS} wpm={700} />

    <div class="cta">
      <button class="go" type="button" onclick={onStart} disabled={starting}>
        {t('start_reading')} <span class="ar">→</span>
      </button>
      <div class="sub">
        {t('already_here')}
        <button class="linklike" type="button" onclick={onLogin}>{t('log_in_low')}</button>
      </div>
    </div>
  </div>
</section>

{#if picks.length > 0}
  <section class="starts">
    <div class="wrap">
      <p class="lead">{t('pick_one_up')}</p>
      <div class="picks">
        {#each picks as p (p.slug)}
          <button class="pick" type="button" onclick={() => pick(p.slug)} disabled={!!picking}>
            <div class="t">{p.title}</div>
            <div class="a">{p.author}</div>
            <div class="m">
              {#if picking === p.slug}
                …
              {:else}
                {p.word_count.toLocaleString()} · ~{mins(p.word_count)} {t('min')} →
              {/if}
            </div>
          </button>
        {/each}
      </div>
    </div>
  </section>
{/if}

<section class="plans">
  <div class="wrap">
    <div class="plangrid">
      <div class="plan">
        <div class="pk">FREE</div>
        <div class="price">€0</div>
        <div class="feats">{t('plans_free_feats')} · {t('plans_free_books')}</div>
        <div class="pnote">{t('plans_promise')}</div>
      </div>
      <div class="plan pro">
        <div class="pk">PRO <span class="soon">{t('plans_soon')}</span></div>
        <div class="price">€4<span class="per">/{t('plans_mo')}</span></div>
        <div class="feats">{t('plans_pro_feats')}</div>
        <div class="pnote">{t('plans_yr')}</div>
      </div>
    </div>
  </div>
</section>
