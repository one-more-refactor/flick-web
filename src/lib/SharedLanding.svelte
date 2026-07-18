<script lang="ts">
  // Public share-link landing (contract v0.6, route /s/:token): a preview
  // card and ONE button — the book lands in your own library and starts
  // playing. No account needed (guest is minted lazily).
  import * as api from './api';
  import type { SharedInfo } from './api';
  import { t } from './i18n.svelte';

  let {
    token,
    onStart,
    onBack,
  }: {
    token: string;
    onStart: (token: string) => Promise<void>;
    onBack: () => void;
  } = $props();

  let info = $state<SharedInfo | null>(null);
  let gone = $state(false);
  let busy = $state(false);
  let error = $state<string | null>(null);

  // svelte-ignore state_referenced_locally
  api
    .sharedInfo(token)
    .then((i) => (info = i))
    .catch(() => (gone = true));

  async function start() {
    if (busy) return;
    busy = true;
    error = null;
    try {
      await onStart(token);
    } catch (err) {
      error = err instanceof Error ? err.message : t('err_generic');
      busy = false;
    }
  }

  const mins = $derived(info ? Math.max(1, Math.round(info.word_count / 350)) : 0);
</script>

<div class="wrap sharedview">
  {#if gone}
    <div class="sharecard fadeup">
      <p class="sk">FLICK<b>_</b></p>
      <p class="sgone">{t('shared_gone')}</p>
      <button class="linklike" type="button" onclick={onBack}>← flick</button>
    </div>
  {:else if !info}
    <div class="status">{t('loading')}<span class="cur">_</span></div>
  {:else}
    <div class="sharecard fadeup">
      <p class="sk">{t('shared_intro').toUpperCase()}</p>
      <h1 class="st">{info.title}</h1>
      <p class="sm">
        {#if info.author}{info.author} · {/if}{info.word_count.toLocaleString()}
        {t('words')} · ~{mins} {t('min')}
      </p>
      <button class="btn sgo" type="button" onclick={start} disabled={busy}>
        {busy ? `${t('working')}…` : `${t('start_reading')} →`}
      </button>
      <p class="snote">{t('shared_note')}</p>
    </div>
  {/if}
</div>
