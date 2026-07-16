<script lang="ts">
  import * as api from './api';
  import type { Book, Timeline } from './api';

  let {
    onRead,
    onLogout,
  }: {
    onRead: (book: Book, timeline: Timeline) => void;
    onLogout: () => void;
  } = $props();

  let books = $state<Book[]>([]);
  let loaded = $state(false);
  let sel = $state(0);
  let confirming = $state(false);
  let adding = $state(false);
  let addTitle = $state('');
  let addText = $state('');
  let busy = $state<string | null>(null);
  let error = $state<string | null>(null);
  let dragOver = $state(false);
  let fileInput: HTMLInputElement | undefined = $state();

  const totalWords = $derived(books.reduce((n, b) => n + b.word_count, 0));

  function message(err: unknown): string {
    return err instanceof Error ? err.message : 'request failed';
  }

  async function load(selectId?: string) {
    try {
      books = await api.books();
      if (selectId) {
        const i = books.findIndex((b) => b.id === selectId);
        if (i >= 0) sel = i;
      }
      sel = Math.min(sel, Math.max(0, books.length - 1));
    } catch (err) {
      error = message(err);
    } finally {
      loaded = true;
    }
  }
  load();

  function pct(b: Book): string {
    const p = b.word_count > 0 ? Math.min(100, Math.floor((b.position / b.word_count) * 100)) : 0;
    return `${String(p).padStart(2, '0')}%`;
  }

  async function open(b: Book) {
    if (busy) return;
    busy = 'loading timeline';
    error = null;
    try {
      // re-fetch the book so we resume from the freshest position
      const [fresh, tl] = await Promise.all([api.book(b.id), api.timeline(b.id)]);
      onRead(fresh, tl);
    } catch (err) {
      error = message(err);
      busy = null;
    }
  }

  async function doDelete() {
    const b = books[sel];
    if (!b) return;
    confirming = false;
    busy = 'deleting';
    error = null;
    try {
      await api.deleteBook(b.id);
      await load();
    } catch (err) {
      error = message(err);
    } finally {
      busy = null;
    }
  }

  async function addPaste() {
    if (!addText.trim()) {
      error = 'paste some text first';
      return;
    }
    busy = 'parsing text';
    error = null;
    try {
      const b = await api.createBookFromText(addText, addTitle.trim() || undefined);
      addText = '';
      addTitle = '';
      adding = false;
      await load(b.id);
    } catch (err) {
      error = message(err);
    } finally {
      busy = null;
    }
  }

  async function uploadPdf(file: File) {
    if (!(file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))) {
      error = 'only pdf files';
      return;
    }
    busy = `uploading ${file.name}`;
    error = null;
    try {
      const b = await api.createBookFromPdf(file, addTitle.trim() || undefined);
      addTitle = '';
      adding = false;
      await load(b.id);
    } catch (err) {
      error = message(err);
    } finally {
      busy = null;
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    dragOver = false;
    if (busy) return;
    const file = e.dataTransfer?.files?.[0];
    if (file) void uploadPdf(file);
  }

  function onFileChange(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (file) void uploadPdf(file);
    input.value = '';
  }

  function autofocus(node: HTMLElement) {
    node.focus();
  }

  function onKey(e: KeyboardEvent) {
    const t = e.target as HTMLElement | null;
    const typing = !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA');

    if (e.key === 'Escape') {
      if (adding && !busy) {
        adding = false;
        error = null;
      }
      confirming = false;
      return;
    }
    if (typing || adding || busy) return;

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        sel = Math.max(0, sel - 1);
        confirming = false;
        break;
      case 'ArrowDown':
        e.preventDefault();
        sel = Math.min(Math.max(0, books.length - 1), sel + 1);
        confirming = false;
        break;
      case 'Enter': {
        const b = books[sel];
        if (!b) break;
        if (confirming) void doDelete();
        else void open(b);
        break;
      }
      case 'y':
      case 'Y':
        if (confirming) void doDelete();
        break;
      case 'n':
      case 'N':
        confirming = false;
        break;
      case 'Delete':
      case 'd':
      case 'D':
        if (books[sel]) confirming = true;
        break;
      case 'a':
      case 'A':
        e.preventDefault();
        adding = true;
        error = null;
        break;
    }
  }
</script>

<svelte:window onkeydown={onKey} />

<section class="panel" aria-label="Library">
  <div class="panel-label">
    <span class="lbl">Library</span>
    <span class="counter">{books.length} books · {totalWords} words</span>
  </div>

  {#if !loaded}
    <div class="status">loading<span class="cursor">_</span></div>
  {:else if books.length === 0}
    <div class="status">library empty — press a to add a book</div>
  {:else}
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
    <ul class="lib">
      {#each books as b, i (b.id)}
        <li
          class:sel={i === sel}
          onclick={() => {
            if (i === sel) void open(b);
            else {
              sel = i;
              confirming = false;
            }
          }}
        >
          <span class="idx">{String(i + 1).padStart(2, '0')}</span>
          <span class="title">{b.title}</span>
          <span class="leader"></span>
          {#if confirming && i === sel}
            <span class="del">delete? y/n</span>
          {:else}
            <span class="pct">{pct(b)}</span>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}

  {#if busy}
    <div class="status">{busy}<span class="cursor">_</span></div>
  {/if}
  {#if error}
    <div class="status err">err — {error}</div>
  {/if}

  <div class="hint">
    <span>↑↓ select · <b>enter</b> read · <b>a</b> add · <b>d</b> delete</span>
    <button class="linklike" type="button" onclick={onLogout}>logout →</button>
  </div>
</section>

{#if adding}
  <section
    class="panel"
    class:over={dragOver}
    aria-label="Add book"
    ondragover={(e) => {
      e.preventDefault();
      dragOver = true;
    }}
    ondragleave={() => {
      dragOver = false;
    }}
    ondrop={onDrop}
  >
    <div class="panel-label">
      <span class="lbl">Add book</span>
      <span class="counter">paste · pdf</span>
    </div>
    <div class="form">
      <div class="field">
        <label for="add-title">Title (optional)</label>
        <input id="add-title" type="text" bind:value={addTitle} use:autofocus />
      </div>
      <div class="field">
        <label for="add-text">Paste text</label>
        <textarea id="add-text" bind:value={addText} placeholder="paste anything…"></textarea>
      </div>
      <button class="btn" type="button" onclick={addPaste} disabled={!!busy}>Add text</button>
      <div class="or">— or —</div>
      <div class="drop" class:over={dragOver}>
        drop a pdf anywhere on this panel
        <button class="btn ghost" type="button" onclick={() => fileInput?.click()} disabled={!!busy}>
          choose pdf…
        </button>
        <input
          type="file"
          accept="application/pdf,.pdf"
          hidden
          bind:this={fileInput}
          onchange={onFileChange}
        />
      </div>
    </div>
    <div class="hint"><span><b>esc</b> close</span></div>
  </section>
{/if}
