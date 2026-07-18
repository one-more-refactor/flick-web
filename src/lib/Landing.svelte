<script lang="ts">
  // The landing (guest door). Brand does the talking: the hero reader runs on
  // its own, one CTA, a one-gesture quick-read drop, no captions. Hidden once
  // signed in. Plans strip is edition-aware (hosted: FREE/PRO; selfhost: the
  // PRO card becomes CONTRIBUTE — everything is free when you host it).
  import * as api from './api';
  import type { CatalogEntry } from './api';
  import { t, i18n } from './i18n.svelte';
  import { AUTH_DEMO_WORDS } from './demos';
  import HeroReader from './HeroReader.svelte';

  let {
    onStart,
    onLogin,
    onPick,
    onQuickFile,
    edition = 'selfhost',
    starting = false,
    error = null,
  }: {
    onStart: () => void;
    onLogin: () => void;
    onPick: (slug: string) => void;
    onQuickFile: (file: File) => void;
    edition?: 'selfhost' | 'hosted';
    starting?: boolean;
    error?: string | null;
  } = $props();

  import { REPO } from './consts';

  let picks = $state<CatalogEntry[]>([]);
  let picking = $state<string | null>(null);
  let dragOver = $state(false);
  let fileInput: HTMLInputElement | undefined = $state();

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

  function onDrop(e: DragEvent) {
    e.preventDefault();
    dragOver = false;
    const file = e.dataTransfer?.files?.[0];
    if (file) onQuickFile(file);
  }

  function onFileChange(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (file) onQuickFile(file);
    input.value = '';
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<section
  class="hero"
  ondragover={(e) => {
    e.preventDefault();
    dragOver = true;
  }}
  ondragleave={() => (dragOver = false)}
  ondrop={onDrop}
>
  <div class="wrap">
    <p class="eyebrow">read it in a <b>flick</b></p>

    <HeroReader words={AUTH_DEMO_WORDS} wpm={700} />

    <div class="cta">
      <button class="go" type="button" onclick={onStart} disabled={starting}>
        {t('start_reading')} <span class="ar">→</span>
      </button>
      <button class="quickdrop" class:over={dragOver} type="button" onclick={() => fileInput?.click()}>
        {t('quick_read')}
      </button>
      <input
        type="file"
        accept="application/pdf,.pdf,.epub,.txt,.md,application/epub+zip,text/plain"
        hidden
        bind:this={fileInput}
        onchange={onFileChange}
      />
      {#if error}<div class="status err">{error}</div>{/if}
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

<section class="plans" id="plans">
  <div class="wrap">
    <div class="plangrid">
      <div class="plan">
        <div class="pk">FREE</div>
        <div class="price">€0</div>
        <div class="feats">{t('plans_free_feats')}</div>
        <div class="pnote">{t('plans_promise')}</div>
      </div>
      {#if edition === 'hosted'}
        <div class="plan pro">
          <div class="pk">PRO <span class="soon">{t('plans_soon')}</span></div>
          <div class="price">€4<span class="per">/{t('plans_mo')}</span></div>
          <div class="feats">{t('plans_pro_feats')} · {t('pro_love')}</div>
          <div class="pnote">{t('plans_yr')}</div>
        </div>
      {:else}
        <a class="plan pro contribute" href={REPO} target="_blank" rel="noopener">
          <div class="pk">CONTRIBUTE <span class="soon">♥</span></div>
          <div class="price">git</div>
          <div class="feats">{t('contribute_note')}</div>
          <div class="pnote">{t('contribute_cta')} →</div>
        </a>
      {/if}
    </div>
  </div>
</section>
