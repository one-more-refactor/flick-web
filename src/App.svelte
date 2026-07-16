<script lang="ts">
  import * as api from './lib/api';
  import type { Book, Timeline, User } from './lib/api';
  import Auth from './lib/Auth.svelte';
  import Library from './lib/Library.svelte';
  import Reader from './lib/Reader.svelte';

  type View =
    | { name: 'boot' }
    | { name: 'auth' }
    | { name: 'library' }
    | { name: 'reader'; book: Book; timeline: Timeline };

  let view = $state<View>({ name: 'boot' });
  let user = $state<User | null>(null);

  // Any 401 from a non-auth endpoint means the session is gone — drop to AUTH.
  api.setUnauthorizedHandler(() => {
    user = null;
    view = { name: 'auth' };
  });

  async function boot() {
    try {
      user = await api.me();
      view = { name: 'library' };
    } catch {
      view = { name: 'auth' };
    }
  }
  boot();

  function onAuthed(u: User) {
    user = u;
    view = { name: 'library' };
  }

  function onRead(book: Book, timeline: Timeline) {
    view = { name: 'reader', book, timeline };
  }

  function onExit() {
    view = { name: 'library' };
  }

  async function onLogout() {
    try {
      await api.logout();
    } catch {
      // cookie may already be dead — drop to AUTH regardless
    }
    user = null;
    view = { name: 'auth' };
  }

  const tag = $derived(
    view.name === 'reader' ? 'reader'
    : view.name === 'library' ? 'library'
    : view.name === 'auth' ? 'sign in'
    : 'boot',
  );
</script>

<div class="sheet">
  <header>
    <div class="wordmark">FLICK<span class="cursor">_</span></div>
    <div class="tag">
      {#if user}{user.email}<br />{/if}
      {tag}
    </div>
  </header>

  {#if view.name === 'boot'}
    <section class="panel" aria-label="Connecting">
      <div class="status">connecting<span class="cursor">_</span></div>
    </section>
  {:else if view.name === 'auth'}
    <Auth {onAuthed} />
  {:else if view.name === 'library'}
    <Library {onRead} {onLogout} />
  {:else if view.name === 'reader'}
    <Reader book={view.book} timeline={view.timeline} {onExit} />
  {/if}
</div>
