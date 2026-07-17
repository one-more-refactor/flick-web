<script lang="ts">
  // The product home: continue card, numbered library, stats strip, and the
  // add panel (paste / PDF / shelf). Mockup: docs — landing v0.4, app view.
  import * as api from './api';
  import type { Book, CatalogEntry, Stats, Timeline, User } from './api';
  import { t } from './i18n.svelte';
  import DotNumber from './DotNumber.svelte';

  let {
    user,
    who,
    edition = 'selfhost',
    onRead,
    onStats,
  }: {
    user: User;
    who: string | null;
    edition?: 'selfhost' | 'hosted';
    onRead: (book: Book, timeline: Timeline) => void;
    onStats: () => void;
  } = $props();

  /** Weekly allowance line, only when the server enforces one (hosted+free). */
  const allowance = $derived(
    edition === 'hosted' && user.uploads && user.uploads.limit !== null
      ? Math.max(0, user.uploads.limit - user.uploads.used)
      : null,
  );

  let books = $state<Book[]>([]);
  let stats = $state<Stats | null>(null);
  let loaded = $state(false);
  let adding = $state(false);
  let addTitle = $state('');
  let addText = $state('');
  let shelf = $state<CatalogEntry[]>([]);
  let busy = $state<string | null>(null);
  let error = $state<string | null>(null);
  let confirming = $state<string | null>(null);
  let dragOver = $state(false);
  let fileInput: HTMLInputElement | undefined = $state();

  function message(err: unknown): string {
    return err instanceof Error ? err.message : t('err_generic');
  }

  async function load() {
    try {
      books = await api.books();
    } catch (err) {
      error = message(err);
    } finally {
      loaded = true;
    }
    api.stats().then((s) => (stats = s)).catch(() => {});
    // shelf entries not yet in the library
    api
      .catalog()
      .then((c) => {
        const have = new Set(books.map((b) => b.title));
        shelf = c.filter((e) => !have.has(e.title));
      })
      .catch(() => {});
  }
  load();

  // continue card: the most recently read, unfinished book
  const cont = $derived(
    books
      .filter((b) => b.position > 0 && b.position < b.word_count && b.last_read_at)
      .sort((a, b) => (b.last_read_at ?? 0) - (a.last_read_at ?? 0))[0] ?? null,
  );
  const rest = $derived(books.filter((b) => b !== cont));

  const wordsRead = $derived(books.reduce((n, b) => n + Math.min(b.position, b.word_count), 0));
  const num = (n: number) => n.toLocaleString();

  function pct(b: Book): string {
    const p = b.word_count > 0 ? Math.min(100, Math.floor((b.position / b.word_count) * 100)) : 0;
    return `${String(p).padStart(2, '0')}%`;
  }

  function minsLeft(b: Book): number {
    const wpm = Math.max(100, user.settings.wpm);
    return Math.max(1, Math.round(Math.max(0, b.word_count - b.position) / wpm));
  }

  function desc(b: Book): string {
    const parts: string[] = [];
    if (b.author) parts.push(b.author);
    else if (b.url) {
      try {
        parts.push(new URL(b.url).hostname);
      } catch {
        parts.push(b.source);
      }
    } else parts.push(b.source.toUpperCase());
    parts.push(`${num(b.word_count)} ${t('words')}`);
    if (b.position >= b.word_count && b.word_count > 0) parts.push(t('done'));
    return parts.join(' · ');
  }

  async function open(b: Book) {
    if (busy) return;
    busy = t('loading');
    error = null;
    try {
      const [fresh, tl] = await Promise.all([api.book(b.id), api.timeline(b.id)]);
      onRead(fresh, tl);
    } catch (err) {
      error = message(err);
      busy = null;
    }
  }

  async function doDelete(id: string) {
    confirming = null;
    busy = '…';
    error = null;
    try {
      await api.deleteBook(id);
      await load();
    } catch (err) {
      error = message(err);
    } finally {
      busy = null;
    }
  }

  async function addPaste() {
    if (!addText.trim()) return;
    busy = t('loading');
    error = null;
    try {
      await api.createBookFromText(addText, addTitle.trim() || undefined);
      addText = '';
      addTitle = '';
      adding = false;
      await load();
    } catch (err) {
      error = message(err);
    } finally {
      busy = null;
    }
  }

  async function uploadFile(file: File) {
    busy = file.name;
    error = null;
    try {
      await api.createBookFromFile(file, addTitle.trim() || undefined);
      addTitle = '';
      adding = false;
      await load();
    } catch (err) {
      error = message(err);
    } finally {
      busy = null;
    }
  }

  let importLink = $state('');

  async function importFromUrl() {
    const url = importLink.trim();
    if (!url) return;
    busy = url;
    error = null;
    try {
      await api.importUrl(url, addTitle.trim() || undefined);
      importLink = '';
      addTitle = '';
      adding = false;
      await load();
    } catch (err) {
      error = message(err);
    } finally {
      busy = null;
    }
  }

  // ---- server-side FTS search (title/author/full text) ----
  let query = $state('');
  let results = $state<Book[] | null>(null);
  let searchTimer: ReturnType<typeof setTimeout> | undefined;

  function onQuery() {
    clearTimeout(searchTimer);
    const q = query.trim();
    if (!q) {
      results = null;
      return;
    }
    searchTimer = setTimeout(() => {
      api
        .books(q)
        .then((r) => {
          if (query.trim() === q) results = r;
        })
        .catch(() => {});
    }, 250);
  }

  async function addFromShelf(slug: string) {
    busy = t('loading');
    error = null;
    try {
      await api.catalogAdd(slug);
      adding = false;
      await load();
    } catch (err) {
      // 409 = already there; just refresh
      await load();
      if (!(err instanceof api.ApiError && err.status === 409)) error = message(err);
    } finally {
      busy = null;
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    dragOver = false;
    if (busy) return;
    const file = e.dataTransfer?.files?.[0];
    if (file) void uploadFile(file);
  }

  function onFileChange(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (file) void uploadFile(file);
    input.value = '';
  }
</script>

<div class="wrap lib">
  <div class="head">
    <div class="who">@<b>{who}</b></div>
    <div class="metar">
      {books.length}
      {t('books_k')} · {num(stats?.total_words ?? wordsRead)}
      {t('words_read_k')}
    </div>
  </div>

  {#if !loaded}
    <div class="status">{t('loading')}<span class="cur">_</span></div>
  {:else}
    {#if cont}
      <div class="cont fadeup">
        <div class="l">
          <div class="k">{t('continue_k')}</div>
          <div class="t">{cont.title}</div>
          <div class="p">{pct(cont)} · ~{minsLeft(cont)} {t('min')} {t('left')}</div>
        </div>
        <button class="btn" type="button" onclick={() => cont && open(cont)}>
          {t('resume')} →
        </button>
      </div>
    {/if}

    {#if books.length > 3}
      <input
        class="search"
        type="search"
        placeholder={t('search_ph')}
        bind:value={query}
        oninput={onQuery}
        aria-label={t('search_ph')}
      />
    {/if}

    <div class="list">
      {#if books.length === 0}
        <div class="empty">{t('add_something')} ↓</div>
      {:else if results !== null && results.length === 0}
        <div class="empty">— {query} —</div>
      {:else}
        {#each results ?? rest as b, i (b.id)}
          <div class="rowbook">
            <button
              class="no"
              type="button"
              aria-hidden="true"
              tabindex="-1"
              onclick={() => open(b)}
            >{String(i + 1).padStart(2, '0')}</button>
            <button class="main" type="button" style="all:unset;flex:1;min-width:0;cursor:pointer" onclick={() => open(b)}>
              <div class="t">{b.title}</div>
              <div class="d">{desc(b)}</div>
            </button>
            {#if confirming === b.id}
              <span class="rdel" style="color: var(--accent)">
                {t('delete_q')}
                <button class="linklike" type="button" onclick={() => doDelete(b.id)}><b>y</b></button>
                /
                <button class="linklike" type="button" onclick={() => (confirming = null)}>n</button>
              </span>
            {:else}
              <span class="pct">{pct(b)}</span>
              <button
                class="rdel"
                type="button"
                aria-label="delete {b.title}"
                onclick={() => (confirming = b.id)}
              >×</button>
            {/if}
          </div>
        {/each}
      {/if}
    </div>

    {#if busy}<div class="status" style="margin-top:12px">{busy}<span class="cur">_</span></div>{/if}
    {#if error}<div class="status err" style="margin-top:12px">{error}</div>{/if}

    <div style="display:flex; justify-content:flex-end; align-items:baseline; gap:14px; margin-top:12px">
      {#if allowance !== null && adding}
        <span class="cap">{allowance} {t('uploads_left')}</span>
      {/if}
      <button class="linklike" type="button" onclick={() => (adding = !adding)}>
        {adding ? `× ${t('close')}` : `+ ${t('add')}`}
      </button>
    </div>

    {#if adding}
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="panel addp"
        class:over={dragOver}
        ondragover={(e) => {
          e.preventDefault();
          dragOver = true;
        }}
        ondragleave={() => (dragOver = false)}
        ondrop={onDrop}
      >
        <div class="inner">
          <div class="field">
            <label for="add-title">{t('title_opt')}</label>
            <input id="add-title" type="text" bind:value={addTitle} />
          </div>
          <div class="field">
            <label for="add-text">{t('paste_label')}</label>
            <textarea id="add-text" bind:value={addText} placeholder={t('paste_ph')}></textarea>
          </div>
          <button class="btn" type="button" onclick={addPaste} disabled={!!busy || !addText.trim()}>
            {t('add_text')} →
          </button>
          <div class="or">{t('auth_or')}</div>
          <div class="field">
            <label for="add-url">{t('url_label')}</label>
            <div class="urlrow">
              <input id="add-url" type="url" bind:value={importLink} placeholder="https://…" />
              <button class="btn" type="button" onclick={importFromUrl} disabled={!!busy || !importLink.trim()}>
                {t('import_url')} →
              </button>
            </div>
          </div>
          <div class="or">{t('auth_or')}</div>
          <div class="drop" class:over={dragOver}>
            {t('drop_file')}
            <button class="btn ghost" type="button" onclick={() => fileInput?.click()} disabled={!!busy}>
              {t('choose_file')}
            </button>
            <input
              type="file"
              accept="application/pdf,.pdf,.epub,.txt,.md,application/epub+zip,text/plain"
              hidden
              bind:this={fileInput}
              onchange={onFileChange}
            />
          </div>
          {#if shelf.length > 0}
            <div class="or">{t('from_catalog')}</div>
            <div class="shelf">
              {#each shelf as s (s.slug)}
                <button class="shelfrow" type="button" onclick={() => addFromShelf(s.slug)} disabled={!!busy}>
                  <span class="t">{s.title}</span>
                  <span class="a">{s.author}</span>
                  <span class="m">{num(s.word_count)} →</span>
                </button>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    {/if}

    <div class="statsrow">
      <button class="stat statlink" type="button" onclick={onStats}>
        <DotNumber value={stats?.streak.current ?? 0} />
        <div class="lab">{t('day_streak_k')} →</div>
      </button>
      <button class="stat statlink" type="button" onclick={onStats}>
        <div class="plain">{num(stats?.total_words ?? 0)}</div>
        <div class="lab">{t('words_read_k')}</div>
      </button>
      <button class="stat statlink" type="button" onclick={onStats}>
        <div class="plain">{num(stats?.today.words ?? 0)}</div>
        <div class="lab">{t('today_k')}</div>
      </button>
    </div>
  {/if}
</div>
