<script lang="ts">
  // Guided add flow (contract v0.4.3): full-screen, two steps — pick a
  // source, feed it — then straight into the reader. Esc/×/back everywhere.
  import * as api from './api';
  import type { Book, CatalogEntry, Timeline } from './api';
  import { t } from './i18n.svelte';

  let {
    onRead,
    onClose,
  }: {
    onRead: (book: Book, timeline: Timeline) => void;
    onClose: () => void;
  } = $props();

  type Source = 'paste' | 'file' | 'url' | 'cloud' | 'catalog';
  let source = $state<Source | null>(null);
  let busy = $state<string | null>(null);
  let error = $state<string | null>(null);

  let title = $state('');
  let tags = $state('');
  let text = $state('');
  let link = $state('');
  let dragOver = $state(false);
  let fileInput: HTMLInputElement | undefined = $state();
  let shelf = $state<CatalogEntry[]>([]);

  const SOURCES: { key: Source; icon: string; name: string; desc: string }[] = $derived([
    { key: 'paste', icon: '¶', name: t('src_paste'), desc: t('src_paste_d') },
    { key: 'file', icon: '▤', name: t('src_file'), desc: t('src_file_d') },
    { key: 'url', icon: '↗', name: t('src_url'), desc: t('src_url_d') },
    { key: 'cloud', icon: '☁', name: t('src_cloud'), desc: t('src_cloud_d') },
    { key: 'catalog', icon: '§', name: t('src_catalog'), desc: t('src_catalog_d') },
  ]);

  function pick(s: Source) {
    source = s;
    error = null;
    if (s === 'catalog' && shelf.length === 0) {
      api.catalog().then((c) => (shelf = c)).catch(() => {});
    }
  }

  function back() {
    if (busy) return;
    if (source === null) onClose();
    else {
      source = null;
      error = null;
    }
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      back();
    }
  }

  function parseTags(): string[] {
    return tags
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 12);
  }

  function message(err: unknown): string {
    return err instanceof Error ? err.message : t('err_generic');
  }

  /** Common tail: optional tags, fetch the timeline, open the reader. */
  async function finish(book: Book) {
    const wanted = parseTags();
    if (wanted.length > 0) {
      try {
        book = await api.setTags(book.id, [...new Set([...book.tags, ...wanted])]);
      } catch {
        // tags are decoration — never block the read on them
      }
    }
    const tl = await api.timeline(book.id);
    onRead(book, tl);
  }

  async function run(label: string, make: () => Promise<Book>) {
    if (busy) return;
    busy = label;
    error = null;
    try {
      await finish(await make());
    } catch (err) {
      error = message(err);
      busy = null;
    }
  }

  const goPaste = () =>
    run(t('loading'), () => api.createBookFromText(text, title.trim() || undefined));

  const goFile = (file: File) =>
    run(file.name, () => api.createBookFromFile(file, title.trim() || undefined));

  const goUrl = () => run(link, () => api.importUrl(link.trim(), title.trim() || undefined));

  function goCloud() {
    const direct = api.cloudDirectUrl(link);
    if (!direct) {
      error = t('wiz_cloud_bad');
      return;
    }
    void run(link, () => api.importUrl(direct, title.trim() || undefined));
  }

  const goCatalog = (slug: string) =>
    run(t('loading'), async () => {
      try {
        return await api.catalogAdd(slug);
      } catch (err) {
        // pre-seeded library: 409 carries the existing copy (contract v0.4.1)
        if (err instanceof api.ApiError && err.status === 409 && err.bookId) {
          return api.book(err.bookId);
        }
        throw err;
      }
    });

  function onDrop(e: DragEvent) {
    e.preventDefault();
    dragOver = false;
    const file = e.dataTransfer?.files?.[0];
    if (file) void goFile(file);
  }

  function onFileChange(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (file) void goFile(file);
    input.value = '';
  }

  function autofocus(node: HTMLElement) {
    node.focus();
  }
</script>

<svelte:window onkeydown={onKey} />

<div class="wiz" role="dialog" aria-modal="true" aria-label={t('add_something')}>
  <div class="wtop">
    <span class="wstep">{source === null ? '01' : '02'}<i>/02</i></span>
    <span class="wq">{source === null ? t('wiz_source_q') : t('add_something')}</span>
    <button class="wx" type="button" aria-label={t('close')} onclick={onClose}>×</button>
  </div>

  <div class="wbody">
    {#if source === null}
      <div class="wopts">
        {#each SOURCES as s, i (s.key)}
          <button class="wopt" type="button" style="--i:{i}" onclick={() => pick(s.key)}>
            <span class="wicon">{s.icon}</span>
            <span class="wname">{s.name}</span>
            <span class="wdesc">{s.desc}</span>
            <span class="war">→</span>
          </button>
        {/each}
      </div>
    {:else if source === 'catalog'}
      <div class="wshelf">
        {#each shelf as s (s.slug)}
          <button class="shelfrow" type="button" onclick={() => goCatalog(s.slug)} disabled={!!busy}>
            <span class="t">{s.title}</span>
            <span class="a">{s.author}</span>
            <span class="m">{s.word_count.toLocaleString()} →</span>
          </button>
        {:else}
          <div class="status">{t('loading')}<span class="cur">_</span></div>
        {/each}
      </div>
    {:else}
      <form
        class="wform"
        onsubmit={(e) => {
          e.preventDefault();
          if (source === 'paste') void goPaste();
          else if (source === 'url') void goUrl();
          else if (source === 'cloud') goCloud();
        }}
      >
        {#if source === 'paste'}
          <div class="field">
            <label for="wiz-text">{t('paste_label')}</label>
            <textarea id="wiz-text" bind:value={text} placeholder={t('paste_ph')} use:autofocus
            ></textarea>
          </div>
        {:else if source === 'file'}
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div
            class="drop big"
            class:over={dragOver}
            ondragover={(e) => {
              e.preventDefault();
              dragOver = true;
            }}
            ondragleave={() => (dragOver = false)}
            ondrop={onDrop}
          >
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
        {:else}
          <div class="field">
            <label for="wiz-link">{source === 'cloud' ? t('src_cloud') : t('url_label')}</label>
            <input
              id="wiz-link"
              type="url"
              bind:value={link}
              placeholder="https://…"
              use:autofocus
            />
            {#if source === 'cloud'}<span class="fhint">{t('wiz_cloud_hint')}</span>{/if}
          </div>
        {/if}

        <div class="field">
          <label for="wiz-title">{t('title_opt')}</label>
          <input id="wiz-title" type="text" bind:value={title} />
        </div>
        <div class="field">
          <label for="wiz-tags">{t('tags_label')}</label>
          <input id="wiz-tags" type="text" bind:value={tags} placeholder="work, sci-fi" />
        </div>

        {#if source !== 'file'}
          <button
            class="btn"
            type="submit"
            disabled={!!busy ||
              (source === 'paste' ? !text.trim() : !link.trim())}
          >
            {busy ? `${t('working')}…` : `${t('wiz_go')} →`}
          </button>
        {/if}
      </form>
    {/if}

    {#if busy}<div class="status" style="margin-top:14px">{busy}<span class="cur">_</span></div>{/if}
    {#if error}<div class="status err" style="margin-top:14px">{error}</div>{/if}
  </div>

  <div class="wfoot">
    <button class="linklike" type="button" onclick={back}>← {t('auth_back')}</button>
  </div>
</div>
