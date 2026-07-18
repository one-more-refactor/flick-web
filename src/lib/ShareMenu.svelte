<script lang="ts">
  // Share popup (contract v0.8): pick what the recipient may do (import a copy
  // vs read-only), copy the link, open the native OS share sheet, or nudge an
  // invite to flick. Mints/updates the share token as the switch flips.
  import * as api from './api';
  import type { Book, ShareMode } from './api';
  import { t } from './i18n.svelte';

  let {
    book,
    onClose,
    onInvite,
  }: {
    book: Book;
    onClose: () => void;
    onInvite?: () => void;
  } = $props();

  let mode = $state<ShareMode>('import');
  let path = $state<string | null>(null);
  let busy = $state(false);
  let copied = $state(false);
  let error = $state<string | null>(null);

  const canNativeShare = typeof navigator !== 'undefined' && 'share' in navigator;
  const url = $derived(path ? `${location.origin}${path}` : '');

  async function sync(next: ShareMode) {
    mode = next;
    busy = true;
    error = null;
    try {
      const link = await api.shareBook(book.id, next);
      path = link.path;
    } catch (err) {
      error = err instanceof Error ? err.message : t('err_generic');
    } finally {
      busy = false;
    }
  }
  // svelte-ignore state_referenced_locally
  sync(mode);

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      copied = true;
      setTimeout(() => (copied = false), 1800);
    } catch {
      // link stays visible for manual copy
    }
  }

  async function nativeShare() {
    if (!url) return;
    try {
      await navigator.share({ title: book.title, text: t('shared_intro'), url });
    } catch {
      // user dismissed the share sheet — nothing to do
    }
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') onClose();
  }
</script>

<svelte:window onkeydown={onKey} />

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="sheet-back" onclick={onClose}>
  <div class="sheet" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" tabindex="-1">
    <div class="sheethead">
      <span class="cap">{t('share_title')}</span>
      <button class="sheetx" type="button" onclick={onClose} aria-label={t('close')}>×</button>
    </div>
    <div class="sheettitle">{book.title}</div>

    <div class="segwrap">
      <span class="segk">{t('share_can_do')}</span>
      <div class="seg" role="group">
        <button class="segopt" class:on={mode === 'import'} type="button" disabled={busy} onclick={() => sync('import')}>
          {t('share_import_opt')}
        </button>
        <button class="segopt" class:on={mode === 'read'} type="button" disabled={busy} onclick={() => sync('read')}>
          {t('share_read_opt')}
        </button>
      </div>
    </div>

    <div class="linkrow">
      <code>{busy && !path ? `${t('working')}…` : url}</code>
    </div>

    <div class="sheetactions">
      {#if canNativeShare}
        <button class="btn" type="button" onclick={nativeShare} disabled={!path}>{t('share_native')}</button>
      {/if}
      <button class="btn ghost" type="button" onclick={copy} disabled={!path}>
        {copied ? `✓ ${t('link_copied')}` : t('share_copy')}
      </button>
    </div>

    {#if error}<div class="status err" style="margin-top:4px">{error}</div>{/if}

    {#if onInvite}
      <button class="linklike shareinv" type="button" onclick={onInvite}>{t('share_with_friend')} →</button>
    {/if}
  </div>
</div>
