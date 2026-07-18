<script lang="ts">
  // The landing (guest door) — v0.8 redesign. Five bands, 96px rhythm, 880px
  // wrap (design brief "Homepage"): HERO (the auto-running reader IS the
  // headline; terminal type-on eyebrow, one CTA, one-gesture quick-read) →
  // HOW (the page's single inverse-video band, [01]/[02]/[03]) → NUMBERS
  // (dot-matrix count-ups) → SHELF (catalog picks as library flipper rows) →
  // PLANS (edition-aware) + spec sheet + closing CTA.
  //
  // Motion: CSS handles the load beat (flash-proof, instant); GSAP/Lenis are
  // lazy-loaded AFTER paint for scroll choreography and skipped entirely
  // under prefers-reduced-motion. Hidden once signed in.
  import { onMount } from 'svelte';
  import * as api from './api';
  import type { CatalogEntry } from './api';
  import { t, i18n } from './i18n.svelte';
  import { AUTH_DEMO_WORDS } from './demos';
  import { REPO } from './consts';
  import HeroReader from './HeroReader.svelte';
  import HowBand from './landing/HowBand.svelte';
  import NumbersBand from './landing/NumbersBand.svelte';

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

  let picks = $state<CatalogEntry[]>([]);
  let picking = $state<string | null>(null);
  let dragOver = $state(false);
  let fileInput: HTMLInputElement | undefined = $state();
  let rootEl: HTMLElement | undefined = $state();

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
      // shelf band simply stays hidden
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

  // Scroll choreography (GSAP + Lenis) — lazy chunk, motion-safe users only.
  // The landing is fully usable if this never arrives.
  onMount(() => {
    let cleanup: (() => void) | undefined;
    let gone = false;
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      import('./landing/motion')
        .then((m) => {
          if (gone || !rootEl) return;
          cleanup = m.mountLandingMotion(rootEl);
        })
        .catch(() => {
          // no motion, no problem — every band is visible by default
        });
    }
    return () => {
      gone = true;
      cleanup?.();
    };
  });
</script>

<div class="lp" bind:this={rootEl}>
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <section
    class="lp-hero"
    ondragover={(e) => {
      e.preventDefault();
      dragOver = true;
    }}
    ondragleave={() => (dragOver = false)}
    ondrop={onDrop}
  >
    <div class="lp-wrap">
      <p class="lp-eyebrow">
        <span class="lp-type">read it in a <b>flick</b></span><span class="lp-cur">_</span>
      </p>

      <HeroReader words={AUTH_DEMO_WORDS} wpm={700} meter />

      <div class="lp-cta">
        <button class="lp-go lp-in lp-i1" type="button" onclick={onStart} disabled={starting}>
          {t('start_reading')} <span class="lp-ar">→</span>
        </button>
        <button
          class="lp-drop lp-in lp-i2"
          class:over={dragOver}
          type="button"
          onclick={() => fileInput?.click()}
        >
          {t('quick_read')}
        </button>
        <input
          type="file"
          accept="application/pdf,.pdf,.epub,.txt,.md,application/epub+zip,text/plain"
          hidden
          bind:this={fileInput}
          onchange={onFileChange}
        />
        {#if error}<div class="lp-err" role="alert">{error}</div>{/if}
        <div class="lp-sub lp-in lp-i3">
          {t('already_here')}
          <button class="lp-linklike" type="button" onclick={onLogin}>{t('log_in_low')}</button>
        </div>
      </div>
    </div>
  </section>

  <HowBand />
  <NumbersBand />

  {#if picks.length > 0}
    <section class="lp-shelf" data-lp-band>
      <div class="lp-wrap">
        <h2 class="lp-lead">{t('pick_one_up')}</h2>
        <div class="lp-rows" data-lp-reveal>
          {#each picks as p, i (p.slug)}
            <button class="lp-pickrow" type="button" onclick={() => pick(p.slug)} disabled={!!picking}>
              <span class="pr-ix">{String(i + 1).padStart(2, '0')}</span>
              <span class="pr-t">{p.title}</span>
              <span class="pr-a">{p.author}</span>
              <span class="pr-dots"></span>
              <span class="pr-m">
                {#if picking === p.slug}
                  …
                {:else}
                  {p.word_count.toLocaleString()} · ~{mins(p.word_count)} {t('min')} →
                {/if}
              </span>
            </button>
          {/each}
        </div>
      </div>
    </section>
  {/if}

  <section class="lp-plans" id="plans" data-lp-band>
    <div class="lp-wrap">
      <div class="lp-plangrid">
        <div class="lp-plan" data-lp-reveal>
          <div class="pk">FREE</div>
          <div class="price">€0</div>
          <div class="feats">{t('plans_free_feats')}</div>
          <div class="pnote">{t('plans_promise')}</div>
        </div>
        {#if edition === 'hosted'}
          <div class="lp-plan pro" data-lp-reveal>
            <div class="pk">PRO <span class="soon">{t('plans_soon')}</span></div>
            <div class="price">€4<span class="per">/{t('plans_mo')}</span></div>
            <div class="feats">{t('plans_pro_feats')} · {t('pro_love')}</div>
            <div class="pnote">{t('plans_yr')}</div>
          </div>
        {:else}
          <a class="lp-plan pro contribute" href={REPO} target="_blank" rel="noopener" data-lp-reveal>
            <div class="pk">CONTRIBUTE <span class="soon">♥</span></div>
            <div class="price">git</div>
            <div class="feats">{t('contribute_note')}</div>
            <div class="pnote">{t('contribute_cta')} →</div>
          </a>
        {/if}
      </div>

      <!-- quiet spec sheet — the open-source / privacy story, dotted leaders -->
      <div class="lp-spec" data-lp-reveal>
        <div class="sp-row">
          <span class="sp-k">{t('lp_spec_engine_k')}</span><span class="sp-dots"></span>
          <span class="sp-v">{t('lp_spec_engine_v')}</span>
        </div>
        <div class="sp-row">
          <span class="sp-k">{t('lp_spec_privacy_k')}</span><span class="sp-dots"></span>
          <span class="sp-v">{t('lp_spec_privacy_v')}</span>
        </div>
        <div class="sp-row">
          <span class="sp-k">{t('lp_spec_formats_k')}</span><span class="sp-dots"></span>
          <span class="sp-v">{t('lp_spec_formats_v')}</span>
        </div>
        <div class="sp-row">
          <span class="sp-k">{t('lp_spec_source_k')}</span><span class="sp-dots"></span>
          <a class="sp-v sp-link" href={REPO} target="_blank" rel="noopener">github →</a>
        </div>
      </div>

      <div class="lp-final" data-lp-reveal>
        <button class="lp-go" type="button" onclick={onStart} disabled={starting}>
          {t('start_reading')} <span class="lp-ar">→</span>
        </button>
        <div class="lp-sub">
          {t('already_here')}
          <button class="lp-linklike" type="button" onclick={onLogin}>{t('log_in_low')}</button>
        </div>
      </div>
    </div>
  </section>
</div>

<style>
  /* ————— shared band furniture (landing-scoped; app.css stays untouched) — */
  .lp-wrap {
    width: 100%;
    max-width: 880px;
    margin: 0 auto;
    padding: 0 28px;
  }
  .lp-lead {
    font-size: 11px;
    font-weight: 400;
    letter-spacing: 0.24em;
    text-transform: uppercase;
    color: var(--dim);
    text-align: center;
    margin: 0 0 clamp(30px, 5vh, 48px);
  }
  .lp-lead::before {
    content: '— ';
    color: var(--accent);
  }
  .lp-lead::after {
    content: ' —';
    color: var(--accent);
  }

  /* ————— hero ————— */
  .lp-hero {
    padding: clamp(56px, 11vh, 120px) 0 clamp(44px, 8vh, 88px);
    text-align: center;
  }
  .lp-eyebrow {
    font-size: 12px;
    letter-spacing: 0.05em;
    color: var(--dim);
    margin: 0 0 clamp(30px, 6vh, 60px);
    white-space: nowrap;
  }
  .lp-eyebrow b {
    color: var(--ink);
    font-weight: 400;
  }
  /* terminal type-on (design brief §5): steps() width clip, 600ms cap; the
     cursor blinks from frame zero, then the line prints under it */
  .lp-eyebrow .lp-type {
    display: inline-block;
    overflow: hidden;
    vertical-align: bottom;
    max-width: calc(18ch + 18 * 0.05em);
    animation: lp-type 600ms steps(18, end) 200ms backwards;
  }
  @keyframes lp-type {
    from {
      max-width: 0;
    }
  }
  .lp-eyebrow .lp-cur {
    color: var(--accent);
    animation: lp-blink 1.15s steps(1) infinite;
  }
  @keyframes lp-blink {
    50% {
      opacity: 0;
    }
  }

  /* load beat: CTA group fades up 7px, staggered — CSS so it is instant,
     flash-proof, and dies cleanly under reduced motion */
  .lp-in {
    opacity: 0;
    transform: translateY(7px);
    animation: lp-fu 420ms var(--ease) forwards;
  }
  .lp-i1 {
    animation-delay: 0.18s;
  }
  .lp-i2 {
    animation-delay: 0.26s;
  }
  .lp-i3 {
    animation-delay: 0.34s;
  }
  @keyframes lp-fu {
    to {
      opacity: 1;
      transform: none;
    }
  }

  .lp-cta {
    margin-top: clamp(40px, 7vh, 76px);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
  }
  /* fill-wipe CTA (design brief §5 — a solid accent plane, not a gradient) */
  .lp-go {
    font-size: 13px;
    letter-spacing: 0.1em;
    padding: 15px 40px;
    border: 1px solid var(--ink);
    background: linear-gradient(var(--accent), var(--accent)) no-repeat left / 0% 100%;
    transition:
      background-size var(--t-std) var(--ease),
      color var(--t-std) var(--ease),
      border-color var(--t-std);
  }
  .lp-go:hover,
  .lp-go:focus-visible {
    background-size: 100% 100%;
    color: var(--bg);
    border-color: var(--accent);
  }
  .lp-go:active {
    transform: translateY(1px);
  }
  .lp-go:disabled {
    opacity: 0.5;
    cursor: default;
  }
  .lp-go .lp-ar {
    color: var(--accent);
    margin-left: 12px;
    transition: color var(--t-std);
  }
  .lp-go:hover .lp-ar,
  .lp-go:focus-visible .lp-ar {
    color: var(--bg);
  }

  .lp-drop {
    font-size: 11px;
    letter-spacing: 0.06em;
    color: var(--dim);
    border: 1px dashed var(--line);
    padding: 10px 22px;
    transition:
      border-color 160ms,
      color 160ms;
  }
  .lp-drop:hover,
  .lp-drop.over {
    border-color: var(--accent);
    color: var(--ink);
  }

  .lp-err {
    font-size: 12px;
    letter-spacing: 0.04em;
    color: var(--accent);
  }

  .lp-sub {
    font-size: 12px;
    color: var(--dim);
  }
  .lp-linklike {
    color: var(--ink);
    border-bottom: 1px solid var(--line);
    padding-bottom: 1px;
    cursor: pointer;
  }
  .lp-linklike:hover {
    border-color: var(--accent);
  }

  /* ————— shelf: catalog picks as library flipper rows ————— */
  .lp-shelf {
    border-top: 1px solid var(--line);
    padding: clamp(56px, 9vh, 96px) 0;
  }
  .lp-rows {
    max-width: 640px;
    margin: 0 auto;
    border: 1px solid var(--line);
    background: var(--panel);
  }
  .lp-pickrow {
    display: flex;
    align-items: baseline;
    gap: 12px;
    width: 100%;
    text-align: left;
    padding: 14px 16px;
    border-top: 1px solid var(--line);
    /* inverse-video flip is instant — instrument-direct, like the library */
    transition: none;
  }
  .lp-pickrow:first-child {
    border-top: 0;
  }
  .lp-pickrow:hover:not(:disabled),
  .lp-pickrow:focus-visible {
    background: var(--ink);
    color: var(--bg);
  }
  .lp-pickrow:disabled {
    cursor: default;
    opacity: 0.6;
  }
  .pr-ix {
    font-size: 10px;
    letter-spacing: 0.1em;
    color: var(--dim);
  }
  .pr-t {
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 45%;
  }
  .pr-a {
    font-size: 11px;
    color: var(--dim);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .pr-dots {
    flex: 1;
    min-width: 16px;
    border-bottom: 1px dotted var(--dim);
    transform: translateY(-3px);
  }
  .pr-m {
    font-size: 11px;
    color: var(--accent);
    letter-spacing: 0.02em;
    white-space: nowrap;
  }
  /* inverse rows: keep every part legible on the ink ground */
  .lp-pickrow:hover:not(:disabled) .pr-ix,
  .lp-pickrow:hover:not(:disabled) .pr-a,
  .lp-pickrow:hover:not(:disabled) .pr-m,
  .lp-pickrow:focus-visible .pr-ix,
  .lp-pickrow:focus-visible .pr-a,
  .lp-pickrow:focus-visible .pr-m {
    color: var(--bg);
  }
  @media (max-width: 560px) {
    .lp-pickrow {
      flex-wrap: wrap;
      row-gap: 4px;
    }
    .pr-t {
      max-width: none;
      flex: 1 1 100%;
      order: -1;
    }
    .pr-dots {
      display: none;
    }
    .pr-m {
      margin-left: auto;
    }
  }

  /* ————— plans + spec + closing CTA ————— */
  .lp-plans {
    border-top: 1px solid var(--line);
    padding: clamp(56px, 9vh, 96px) 0 clamp(64px, 10vh, 104px);
  }
  .lp-plangrid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
    max-width: 640px;
    margin: 0 auto;
  }
  @media (max-width: 560px) {
    .lp-plangrid {
      grid-template-columns: 1fr;
    }
  }
  .lp-plan {
    border: 1px solid var(--line);
    background: var(--panel);
    padding: 20px 20px 18px;
  }
  .lp-plan.pro {
    border-color: var(--ink);
  }
  .lp-plan .pk {
    font-size: 11px;
    letter-spacing: 0.22em;
    color: var(--dim);
    display: flex;
    align-items: baseline;
    gap: 10px;
  }
  .lp-plan .soon {
    font-size: 9px;
    letter-spacing: 0.18em;
    color: var(--accent);
    border: 1px solid var(--accent);
    padding: 2px 6px;
  }
  .lp-plan .price {
    font-size: 30px;
    font-weight: 700;
    margin-top: 12px;
  }
  .lp-plan .price .per {
    font-size: 12px;
    font-weight: 400;
    color: var(--dim);
  }
  .lp-plan .feats {
    font-size: 11px;
    color: var(--dim);
    line-height: 1.8;
    margin-top: 10px;
  }
  .lp-plan .pnote {
    font-size: 11px;
    color: var(--accent);
    margin-top: 14px;
    letter-spacing: 0.03em;
  }
  a.lp-plan.contribute {
    display: block;
    text-decoration: none;
    color: inherit;
    transition:
      border-color 160ms,
      transform 160ms var(--ease);
  }
  a.lp-plan.contribute:hover {
    border-color: var(--accent);
    transform: translateY(-2px);
  }
  a.lp-plan.contribute .soon {
    border: none;
    font-size: 12px;
    padding: 0;
  }

  .lp-spec {
    max-width: 560px;
    margin: clamp(36px, 6vh, 56px) auto 0;
  }
  .sp-row {
    display: flex;
    align-items: baseline;
    gap: 10px;
    font-size: 11px;
    line-height: 2.1;
  }
  .sp-k {
    color: var(--dim);
    letter-spacing: 0.14em;
    text-transform: uppercase;
    font-size: 10px;
  }
  .sp-dots {
    flex: 1;
    border-bottom: 1px dotted var(--line);
    transform: translateY(-4px);
  }
  .sp-v {
    color: var(--ink);
    text-align: right;
  }
  a.sp-link {
    text-decoration: none;
    border-bottom: 1px solid var(--line);
  }
  a.sp-link:hover {
    border-color: var(--accent);
  }

  .lp-final {
    margin-top: clamp(48px, 8vh, 76px);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
  }

  /* reduced motion: everything lands settled, nothing types or slides */
  @media (prefers-reduced-motion: reduce) {
    .lp-eyebrow .lp-type {
      animation: none;
    }
    .lp-in {
      animation: none;
      opacity: 1;
      transform: none;
    }
    .lp-go,
    .lp-drop,
    a.lp-plan.contribute {
      transition: none;
    }
  }
</style>
