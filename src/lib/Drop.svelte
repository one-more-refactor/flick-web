<script lang="ts">
  // Drop-anywhere (contract v0.11): a signed-in content view accepts a file
  // dragged onto the window. One file imports and opens the reader; several
  // trigger the bulk-import Pro gate (hosted-free) or a sequential bulk import
  // (Pro / selfhost). All feedback is a terminal-style toast — never a spinner.
  import * as api from './api';
  import type { Book, Timeline, User } from './api';
  import { t } from './i18n.svelte';

  let {
    user,
    edition = 'selfhost',
    active = true,
    onRead,
    onImported,
    onGoPremium,
  }: {
    user: User;
    edition?: 'selfhost' | 'hosted';
    /** Off in the reader / onboarding / auth — drop only where adding fits. */
    active?: boolean;
    onRead: (book: Book, timeline: Timeline) => void;
    /** A book (or several) landed while staying in the current view. */
    onImported: () => void;
    onGoPremium: () => void;
  } = $props();

  const BULK_MAX = 50;

  let dragging = $state(false);
  let depth = 0; // dragenter/leave nest counter — children fire both
  let busy = $state<string | null>(null);
  let done = $state<string | null>(null);
  let error = $state<string | null>(null);
  let errorPro = $state(false); // show a Go-Pro affordance beside the error
  let gate = $state<File[] | null>(null); // multi-file Pro gate, holds the batch
  let doneTimer: ReturnType<typeof setTimeout> | undefined;

  /** Free hosted accounts get the bulk gate; Pro and selfhost never do. */
  const gated = $derived(edition === 'hosted' && !user.pro_active);

  function hasFiles(e: DragEvent): boolean {
    return !!e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files');
  }

  /** A modal that owns its own drop (the add wizard) takes precedence. */
  function modalOwnsDrop(target: EventTarget | null): boolean {
    return !!(target instanceof Element && target.closest('.wiz'));
  }

  function onDragEnter(e: DragEvent) {
    if (!active || busy || gate || !hasFiles(e) || document.querySelector('.wiz')) return;
    depth += 1;
    dragging = true;
  }

  function onDragOver(e: DragEvent) {
    if (!active || busy || gate || !hasFiles(e) || document.querySelector('.wiz')) return;
    e.preventDefault(); // required so the drop event fires
  }

  function onDragLeave() {
    depth = Math.max(0, depth - 1);
    if (depth === 0) dragging = false;
  }

  function onDrop(e: DragEvent) {
    depth = 0;
    dragging = false;
    if (!active || busy || gate) return;
    if (modalOwnsDrop(e.target)) return; // the wizard handles it
    if (!e.dataTransfer) return;
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;
    e.preventDefault();
    void handle(files);
  }

  function message(err: unknown): string {
    return err instanceof Error ? err.message : t('err_generic');
  }

  function flash(msg: string) {
    done = msg;
    clearTimeout(doneTimer);
    doneTimer = setTimeout(() => (done = null), 2400);
  }

  function fail(err: unknown) {
    error = message(err);
    errorPro = err instanceof api.ApiError && err.code === 'upload_limit';
  }

  async function handle(files: File[]) {
    error = null;
    errorPro = false;
    const batch = files.slice(0, BULK_MAX);
    if (batch.length === 1) {
      await importOne(batch[0]);
    } else if (gated) {
      gate = batch; // let the user pick: add one, or Go Pro
    } else {
      await importMany(batch);
    }
  }

  /** One file: import → timeline → straight into the reader. */
  async function importOne(file: File) {
    busy = file.name;
    try {
      const book = await api.createBookFromFile(file);
      const tl = await api.timeline(book.id);
      busy = null;
      onRead(book, tl);
    } catch (err) {
      busy = null;
      fail(err);
    }
  }

  /** Several files (Pro / selfhost): sequential, with an n/m readout. */
  async function importMany(batch: File[]) {
    let added = 0;
    for (const [i, file] of batch.entries()) {
      busy = `${i + 1}/${batch.length} · ${file.name}`;
      try {
        await api.createBookFromFile(file);
        added += 1;
      } catch (err) {
        fail(err);
        if (err instanceof api.ApiError && err.code === 'upload_limit') break;
      }
    }
    busy = null;
    if (added > 0) {
      flash(`${added} ${t('books_added')} ✓`);
      onImported();
    }
  }

  // ---- Pro gate actions ----
  async function gateAddFirst() {
    const first = gate?.[0];
    gate = null;
    if (first) await importOne(first);
  }

  function gateGoPro() {
    gate = null;
    onGoPremium();
  }
</script>

<svelte:window
  ondragenter={onDragEnter}
  ondragover={onDragOver}
  ondragleave={onDragLeave}
  ondrop={onDrop}
/>

{#if dragging}
  <div class="dropover" role="presentation">
    <div class="dropcard">
      <span class="dropmark" aria-hidden="true">▤</span>
      <span class="droptitle">{t('drop_to_add')}<span class="cur">_</span></span>
      <span class="drophint">
        {t('drop_hint_one')} · {gated ? t('drop_hint_more_free') : t('drop_hint_more_pro')}
      </span>
    </div>
  </div>
{/if}

{#if gate}
  <div class="gatewrap" role="dialog" aria-modal="true" aria-label={t('gate_bulk_title')}>
    <div class="gatecard">
      <button class="gatex" type="button" aria-label={t('close')} onclick={() => (gate = null)}
        >×</button
      >
      <span class="gatek">PRO_</span>
      <h2 class="gateh">{t('gate_bulk_title')}</h2>
      <p class="gatecount"><b>{gate.length}</b> {t('gate_files_dropped')}</p>
      <p class="gatebody">{t('gate_bulk_body')}</p>
      <div class="gateacts">
        <button class="btn" type="button" onclick={gateGoPro}>{t('go_pro_arrow')} →</button>
        <button class="linklike" type="button" onclick={gateAddFirst}>{t('gate_add_first')}</button>
      </div>
    </div>
  </div>
{/if}

{#if busy || done || error}
  <div class="droptoast" class:err={!!error} role="status">
    {#if busy}
      <span class="tspin" aria-hidden="true"></span>{t('drop_importing')}: {busy}<span class="cur"
        >_</span
      >
    {:else if error}
      {error}
      {#if errorPro}
        <button class="linklike" type="button" onclick={onGoPremium}>{t('go_pro_arrow')} →</button>
      {/if}
      <button class="tdismiss" type="button" aria-label={t('close')} onclick={() => (error = null)}
        >×</button
      >
    {:else if done}
      {done}
    {/if}
  </div>
{/if}
