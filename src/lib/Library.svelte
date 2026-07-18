<script lang="ts">
  // The product home (contract v0.4.2/v0.4.3): recent cards, tag filter,
  // unnumbered ALL list with in-row progress, trash bin, and the guided
  // add wizard behind a real ADD button.
  import * as api from './api';
  import type { Book, Stats, Timeline, TrashItem, User } from './api';
  import { t } from './i18n.svelte';
  import DotNumber from './DotNumber.svelte';
  import Wizard from './Wizard.svelte';

  let {
    user,
    who,
    edition = 'selfhost',
    onRead,
    onStats,
    onAuth,
  }: {
    user: User;
    who: string | null;
    edition?: 'selfhost' | 'hosted';
    onRead: (book: Book, timeline: Timeline) => void;
    onStats: () => void;
    onAuth?: () => void;
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
  let busy = $state<string | null>(null);
  let error = $state<string | null>(null);
  let confirming = $state<string | null>(null);
  let leaving = $state<string | null>(null);
  let wizardOpen = $state(false);

  // trash bin
  let trashItems = $state<TrashItem[]>([]);
  let trashOpen = $state(false);

  // tags
  let activeTag = $state<string | null>(null);
  let tagging = $state<string | null>(null);
  let tagDraft = $state('');

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
    api.trash().then((tr) => (trashItems = tr.items)).catch(() => {});
  }
  load();

  // Playful pass (contract v0.4.2): the home leads with the last 3 read
  // books as cards; a fresh library suggests its first book instead.
  const recent = $derived(
    books
      .filter((b) => b.last_read_at)
      .sort((a, b) => (b.last_read_at ?? 0) - (a.last_read_at ?? 0))
      .slice(0, 3),
  );
  const cards = $derived(recent.length > 0 ? recent : books.slice(0, 1));

  /** Union of live tags with counts — the filter bar (≥2 distinct tags). */
  const tagBar = $derived.by(() => {
    const counts = new Map<string, number>();
    for (const b of books) for (const tag of b.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  });

  // The ALL list: everything not in the cards — in-progress by recency,
  // then unread (server order), finished last; tag filter applies.
  const listBooks = $derived.by(() => {
    const inCards = new Set(cards.map((b) => b.id));
    const others = books.filter(
      (b) => !inCards.has(b.id) && (activeTag === null || b.tags.includes(activeTag)),
    );
    const rank = (b: Book) =>
      b.word_count > 0 && b.position >= b.word_count ? 2 : b.last_read_at ? 0 : 1;
    return others
      .map((b, i) => ({ b, i }))
      .sort(
        (x, y) =>
          rank(x.b) - rank(y.b) ||
          (y.b.last_read_at ?? 0) - (x.b.last_read_at ?? 0) ||
          x.i - y.i,
      )
      .map((x) => x.b);
  });

  const num = (n: number) => n.toLocaleString();

  function pctNum(b: Book): number {
    return b.word_count > 0 ? Math.min(100, Math.floor((b.position / b.word_count) * 100)) : 0;
  }

  function pct(b: Book): string {
    return `${String(pctNum(b)).padStart(2, '0')}%`;
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

  /** Soft delete with the fly-to-trash animation (contract v0.4.3). */
  async function doDelete(id: string) {
    confirming = null;
    leaving = id;
    error = null;
    await new Promise((r) => setTimeout(r, 430));
    try {
      await api.deleteBook(id);
      await load();
    } catch (err) {
      error = message(err);
    } finally {
      leaving = null;
    }
  }

  async function doRestore(id: string) {
    busy = '…';
    try {
      await api.restoreBook(id);
      await load();
    } catch (err) {
      error = message(err);
    } finally {
      busy = null;
    }
  }

  async function doPurge(id: string) {
    busy = '…';
    try {
      await api.purgeBook(id);
      await load();
    } catch (err) {
      error = message(err);
    } finally {
      busy = null;
    }
  }

  function daysLeft(item: TrashItem): number {
    return Math.max(0, Math.ceil((item.expires_at - Date.now() / 1000) / 86_400));
  }

  // ---- inline tag editing ----
  function startTagging(b: Book) {
    tagging = b.id;
    tagDraft = b.tags.join(', ');
  }

  async function saveTags(id: string) {
    const wanted = tagDraft
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 12);
    tagging = null;
    try {
      await api.setTags(id, wanted);
      await load();
      if (activeTag !== null && !books.some((b) => b.tags.includes(activeTag!))) activeTag = null;
    } catch (err) {
      error = message(err);
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
</script>

<div class="wrap lib">
  <div class="head">
    <div class="who">@<b>{who}</b></div>
  </div>

  {#if user.guest}
    <div class="guestrow">
      <span>{t('guest_hint')}</span>
      <button class="linklike" type="button" onclick={onAuth}>{t('guest_keep')} <b>→</b></button>
    </div>
  {/if}

  {#if !loaded}
    <div class="status">{t('loading')}<span class="cur">_</span></div>
  {:else}
    {#if cards.length > 0}
      <div class="rcards fadeup" class:solo={cards.length === 1}>
        {#each cards as b, i (b.id)}
          <button class="rcard" class:hero={i === 0} type="button" onclick={() => open(b)}>
            <span class="rk">
              {recent.length === 0 ? t('start_here') : i === 0 ? t('continue_k') : t('recent_k')}
            </span>
            <span class="rt">{b.title}</span>
            <span class="rm">
              {b.author ?? b.source.toUpperCase()} · ~{minsLeft(b)} {t('min')} {t('left')}
            </span>
            <span class="rbar"><i style="width: {Math.max(1, pctNum(b))}%"></i></span>
            <span class="rgo"><b>{pct(b)}</b><span class="rres">{t('resume')} →</span></span>
          </button>
        {/each}
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

    <div class="listcap">
      <span class="cap">{t('all_books_k')}</span><i></i>
      {#if allowance !== null}
        <span class="cap">{allowance} {t('uploads_left')}</span>
      {/if}
      <button class="btn addbtn" type="button" onclick={() => (wizardOpen = true)}>
        + {t('add')}
      </button>
    </div>

    {#if tagBar.length > 1 && results === null}
      <div class="tagbar">
        <button
          class="tagchip"
          class:on={activeTag === null}
          type="button"
          onclick={() => (activeTag = null)}
        >{t('tag_all')}</button>
        {#each tagBar as [tag, count] (tag)}
          <button
            class="tagchip"
            class:on={activeTag === tag}
            type="button"
            onclick={() => (activeTag = activeTag === tag ? null : tag)}
          >#{tag}<i>{count}</i></button>
        {/each}
      </div>
    {/if}

    <div class="list">
      {#if books.length === 0}
        <div class="empty">{t('add_something')} ↓</div>
      {:else if results !== null && results.length === 0}
        <div class="empty">— {query} —</div>
      {:else if results === null && listBooks.length === 0 && activeTag !== null}
        <div class="empty">— #{activeTag} —</div>
      {:else}
        {#each results ?? listBooks as b (b.id)}
          <div class="rowbook" class:arm={confirming === b.id} class:bye={leaving === b.id}>
            {#if pctNum(b) > 0}
              <i class="rprog" style="width: {pctNum(b)}%" aria-hidden="true"></i>
            {/if}
            <button class="main" type="button" style="all:unset;flex:1;min-width:0;cursor:pointer" onclick={() => open(b)}>
              <div class="t">{b.title}</div>
              {#if tagging === b.id}
                <div class="d">{desc(b)}</div>
              {:else}
                <div class="d">
                  {desc(b)}
                  {#if b.tags.length > 0}
                    <span class="rowtags">{b.tags.map((x) => `#${x}`).join(' ')}</span>
                  {/if}
                </div>
              {/if}
            </button>
            {#if tagging === b.id}
              <!-- svelte-ignore a11y_autofocus -->
              <input
                class="taginput"
                type="text"
                bind:value={tagDraft}
                placeholder="work, sci-fi"
                autofocus
                onkeydown={(e) => {
                  if (e.key === 'Enter') void saveTags(b.id);
                  else if (e.key === 'Escape') tagging = null;
                }}
                onblur={() => (tagging = null)}
              />
            {:else if confirming === b.id}
              <span class="armq">
                {t('delete_q')}
                <button class="key yes" type="button" onclick={() => doDelete(b.id)}>y</button>
                <button class="key" type="button" onclick={() => (confirming = null)}>n</button>
              </span>
            {:else}
              <span class="pct">{pct(b)}</span>
              <button
                class="rtag"
                type="button"
                aria-label="{t('edit_tags')}: {b.title}"
                title={t('edit_tags')}
                onclick={() => startTagging(b)}
              >#</button>
              <button
                class="rdel"
                type="button"
                aria-label="delete {b.title}"
                onclick={() => (confirming = b.id)}
              >
                <svg class="tcan" viewBox="0 0 16 16" aria-hidden="true">
                  <path class="lid" d="M2.6 4.6h10.8M6.1 4.4V2.9h3.8v1.5" />
                  <path class="bin" d="M4.1 6.6l.5 7.9h6.8l.5-7.9" />
                  <path class="slats" d="M6.5 8.6v3.9M8 8.6v3.9M9.5 8.6v3.9" />
                </svg>
              </button>
            {/if}
          </div>
        {/each}
      {/if}
    </div>

    {#if busy}<div class="status" style="margin-top:12px">{busy}<span class="cur">_</span></div>{/if}
    {#if error}<div class="status err" style="margin-top:12px">{error}</div>{/if}

    {#if trashItems.length > 0}
      <div class="trashsec">
        <button class="trashhead" type="button" onclick={() => (trashOpen = !trashOpen)}>
          <svg class="tcan" viewBox="0 0 16 16" aria-hidden="true">
            <path class="lid" d="M2.6 4.6h10.8M6.1 4.4V2.9h3.8v1.5" />
            <path class="bin" d="M4.1 6.6l.5 7.9h6.8l.5-7.9" />
            <path class="slats" d="M6.5 8.6v3.9M8 8.6v3.9M9.5 8.6v3.9" />
          </svg>
          {t('trash_k')} ({trashItems.length})
          <span class="tw">{trashOpen ? '▾' : '▸'}</span>
        </button>
        {#if trashOpen}
          <div class="trashlist">
            {#each trashItems as item (item.id)}
              <div class="trashrow">
                <span class="tt">{item.title}</span>
                <span class="te">{daysLeft(item)} {t('days_left')}</span>
                <button class="linklike" type="button" onclick={() => doRestore(item.id)}>
                  ↺ {t('restore')}
                </button>
                <button class="linklike purge" type="button" onclick={() => doPurge(item.id)}>
                  {t('purge_now')}
                </button>
              </div>
            {/each}
            <div class="trashnote">{t('trash_note')}</div>
          </div>
        {/if}
      </div>
    {/if}

    <div class="statsrow">
      <button class="stat statlink" type="button" onclick={onStats}>
        <DotNumber value={stats?.streak.current ?? 0} />
        <div class="goalmini" aria-hidden="true">
          <i
            style="width: {Math.min(
              100,
              Math.round(((stats?.today.words ?? 0) / (stats?.goal ?? 300)) * 100),
            )}%"
          ></i>
        </div>
        <div class="lab">
          {t('day_streak_k')} · {t('goal_today')}
          {Math.min(100, Math.round(((stats?.today.words ?? 0) / (stats?.goal ?? 300)) * 100))}% →
        </div>
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

{#if wizardOpen}
  <Wizard
    onRead={(book, tl) => {
      wizardOpen = false;
      onRead(book, tl);
    }}
    onClose={() => {
      wizardOpen = false;
      void load();
    }}
  />
{/if}
