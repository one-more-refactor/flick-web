<script lang="ts">
  import * as api from './lib/api';
  import type { Book, Theme, Timeline, User } from './lib/api';
  import { queueSettings } from './lib/settings';
  import { applyTheme, nextTheme } from './lib/theme';
  import Auth from './lib/Auth.svelte';
  import Library from './lib/Library.svelte';
  import Onboarding from './lib/Onboarding.svelte';
  import Reader from './lib/Reader.svelte';

  type View =
    | { name: 'boot' }
    | { name: 'auth' }
    | { name: 'onboarding' }
    | { name: 'library' }
    | { name: 'reader'; book: Book; timeline: Timeline };

  let view = $state<View>({ name: 'boot' });
  let user = $state<User | null>(null);
  let theme = $state<Theme>('auto');
  let libWords = $state(0);

  // Any 401 from a non-auth endpoint means the session is gone — drop to AUTH.
  api.setUnauthorizedHandler(() => {
    user = null;
    view = { name: 'auth' };
  });

  /** Adopt a user object: remember it and apply their theme account-wide. */
  function adopt(u: User) {
    user = u;
    theme = u.settings.theme;
    applyTheme(theme);
  }

  function route(u: User) {
    // un-onboarded users (fresh register AND first OIDC login) go through intro
    view = u.onboarded ? { name: 'library' } : { name: 'onboarding' };
  }

  async function boot() {
    try {
      const u = await api.me();
      adopt(u);
      route(u);
    } catch {
      view = { name: 'auth' };
    }
  }
  boot();

  function onAuthed(u: User) {
    adopt(u);
    route(u);
  }

  function onOnboarded(u: User) {
    adopt(u);
    view = { name: 'library' };
  }

  function onRead(book: Book, timeline: Timeline) {
    view = { name: 'reader', book, timeline };
  }

  function onExit() {
    view = { name: 'library' };
  }

  function onWpm(wpm: number) {
    if (user) user.settings.wpm = wpm;
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

  function cycleTheme() {
    theme = nextTheme(theme);
    applyTheme(theme);
    if (user) {
      user.settings.theme = theme;
      queueSettings({ theme }, 800); // persists to the account, debounced
    }
  }

  const tag = $derived(
    view.name === 'reader' ? 'reader'
    : view.name === 'library' ? 'library'
    : view.name === 'onboarding' ? 'setup'
    : view.name === 'auth' ? 'sign in'
    : 'boot',
  );
</script>

<div class="sheet">
  <header>
    <div class="wordmark">FLICK<span class="cursor">_</span></div>
    <div class="tag">
      {#if user?.onboarded && user.username}@{user.username}<br />
      {:else if user}{user.email}<br />
      {/if}
      {tag}
    </div>
  </header>

  {#key view.name}
    <div class="viewbox">
      {#if view.name === 'boot'}
        <section class="panel" aria-label="Connecting">
          <div class="status">connecting<span class="cursor">_</span></div>
        </section>
      {:else if view.name === 'auth'}
        <Auth {onAuthed} />
      {:else if view.name === 'onboarding' && user}
        <Onboarding {user} onDone={onOnboarded} {onLogout} />
      {:else if view.name === 'library' && user}
        <Library {user} {onRead} {onLogout} onStats={(n) => (libWords = n)} />
      {:else if view.name === 'reader' && user}
        <Reader book={view.book} timeline={view.timeline} {user} {onExit} {onWpm} />
      {/if}
    </div>
  {/key}

  <footer class="foot">
    <span>flick v0.2{#if user} · {libWords.toLocaleString('en-US')} words loaded{/if}</span>
    <button class="linklike foot-theme" type="button" onclick={cycleTheme}>
      theme: <b>{theme}</b>
    </button>
  </footer>
</div>
