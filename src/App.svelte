<script lang="ts">
  import * as api from './lib/api';
  import type { Book, Lang, Timeline, User } from './lib/api';
  import { themeState, THEME_NAMES, THEME_SWATCH } from './lib/theme.svelte';
  import { i18n, t } from './lib/i18n.svelte';
  import Landing from './lib/Landing.svelte';
  import Auth from './lib/Auth.svelte';
  import Onboarding from './lib/Onboarding.svelte';
  import Library from './lib/Library.svelte';
  import Reader from './lib/Reader.svelte';
  import Stats from './lib/Stats.svelte';
  import Streak from './lib/Streak.svelte';

  type View =
    | { name: 'boot' }
    | { name: 'landing' }
    | { name: 'auth' }
    | { name: 'onboarding' }
    | { name: 'library' }
    | { name: 'reader'; book: Book; timeline: Timeline }
    | { name: 'stats' };

  let view = $state<View>({ name: 'boot' });
  let user = $state<User | null>(null);
  let starting = $state(false);
  let streakShow = $state<number | null>(null);

  // Any 401 from a non-auth endpoint means the session is gone — back to the door.
  api.setUnauthorizedHandler(() => {
    user = null;
    view = { name: 'landing' };
  });

  /** Adopt a user object: remember it and apply their settings app-wide. */
  function adopt(u: User) {
    user = u;
    themeState.adopt(u.settings);
    i18n.adopt(u.settings.lang);
  }

  function route(u: User) {
    // guests never see onboarding; registered un-onboarded users go through it
    view = u.guest || u.onboarded ? { name: 'library' } : { name: 'onboarding' };
  }

  async function boot() {
    try {
      const u = await api.me();
      adopt(u);
      route(u);
    } catch {
      view = { name: 'landing' };
    }
  }
  boot();

  /** Guest-first: "Start reading" needs no account — mint a guest session. */
  async function startGuest(): Promise<User | null> {
    if (user) return user;
    if (starting) return null;
    starting = true;
    try {
      const u = await api.guest();
      adopt(u);
      return u;
    } catch {
      return null;
    } finally {
      starting = false;
    }
  }

  async function onStart() {
    const u = await startGuest();
    if (u) view = { name: 'library' };
  }

  /** Landing catalog pick: session (guest if needed) → add → straight into the reader. */
  async function onPick(slug: string) {
    const u = await startGuest();
    if (!u) return;
    try {
      const added = await api.catalogAdd(slug);
      const [fresh, tl] = await Promise.all([api.book(added.id), api.timeline(added.id)]);
      onRead(fresh, tl);
    } catch {
      view = { name: 'library' }; // 409 = already there — the library shows it
    }
  }

  function onAuthed(u: User) {
    adopt(u);
    route(u);
  }

  function onOnboarded(u: User) {
    adopt(u);
    view = { name: 'library' };
  }

  // ---- streak detection: words-before vs words-after a reading session ----
  let preWords = $state<number | null>(null);

  function onRead(book: Book, timeline: Timeline) {
    view = { name: 'reader', book, timeline };
    preWords = null;
    api
      .stats()
      .then((s) => (preWords = s.today.words))
      .catch(() => {});
  }

  function onExit() {
    view = { name: 'library' };
    const before = preWords;
    if (before === null) return;
    api
      .stats()
      .then((s) => {
        if (before < s.goal && s.today.words >= s.goal) streakShow = s.streak.current;
      })
      .catch(() => {});
  }

  function onWpm(wpm: number) {
    if (user) user.settings.wpm = wpm;
  }

  async function onLogout() {
    try {
      await api.logout();
    } catch {
      // cookie may already be dead — drop to the landing regardless
    }
    user = null;
    themeState.detach();
    i18n.detach();
    view = { name: 'landing' };
  }

  const LANGS: Lang[] = ['auto', 'en', 'de'];

  const who = $derived(
    user ? (user.username ?? (user.guest ? t('guest') : (user.name || user.email))) : null,
  );
  const inReader = $derived(view.name === 'reader');
</script>

<div class="page">
  <header class="top">
    <div class="wrap">
      <button
        class="mark"
        type="button"
        onclick={() => {
          if (user) view = { name: 'library' };
        }}
        aria-label="flick"
      >FLICK<span class="cur">_</span></button>
      <div class="navr">
        <button class="flick" type="button" onclick={() => themeState.flick()} title="light / dark">
          <span class="fl">{themeState.resolved === 'dark' ? 'DARK' : 'LIGHT'}</span>
          <span class="sw"><span class="kn"></span></span>
        </button>
        {#if user?.guest}
          <button class="link" type="button" onclick={() => (view = { name: 'auth' })}>
            {t('save_account')}
          </button>
        {:else if user}
          <button class="link" type="button" onclick={onLogout}>{t('logout')}</button>
        {:else if view.name !== 'auth'}
          <button class="link" type="button" onclick={() => (view = { name: 'auth' })}>
            {t('login')}
          </button>
        {/if}
      </div>
    </div>
  </header>

  <main class:grid={!inReader}>
    {#key view.name}
      <div class="viewbox">
        {#if view.name === 'boot'}
          <div class="wrap" style="padding-top: 40px">
            <div class="status">connecting<span class="cur">_</span></div>
          </div>
        {:else if view.name === 'landing'}
          <Landing {onStart} onLogin={() => (view = { name: 'auth' })} {onPick} {starting} />
        {:else if view.name === 'auth'}
          <Auth {onAuthed} onBack={() => (view = user ? { name: 'library' } : { name: 'landing' })} />
        {:else if view.name === 'onboarding' && user}
          <Onboarding {user} onDone={onOnboarded} />
        {:else if view.name === 'library' && user}
          <Library
            {user}
            {who}
            {onRead}
            onStats={() => (view = { name: 'stats' })}
          />
        {:else if view.name === 'reader' && user}
          <Reader book={view.book} timeline={view.timeline} {user} {onExit} {onWpm} />
        {:else if view.name === 'stats' && user}
          <Stats onBack={() => (view = { name: 'library' })} />
        {/if}
      </div>
    {/key}
  </main>

  {#if !inReader}
    <footer class="app">
      <div class="wrap">
        <div class="appgrp">
          <span class="cap">{t('theme')}</span>
          <div class="themes">
            {#each THEME_NAMES as th (th)}
              <button
                class="th"
                class:on={themeState.theme === th}
                type="button"
                onclick={() => themeState.setTheme(th)}
              >
                <span class="swd" style="--c:{THEME_SWATCH[th]}"></span>{th.toUpperCase()}
              </button>
            {/each}
          </div>
        </div>
        <div class="appgrp">
          <span class="cap">{t('language')}</span>
          <div class="langs">
            {#each LANGS as l (l)}
              <button
                class="lang-opt"
                class:on={i18n.lang === l}
                type="button"
                onclick={() => i18n.setLang(l)}
              >{l}</button>
            {/each}
          </div>
        </div>
        <span class="foot-mark">FLICK_</span>
      </div>
    </footer>
  {/if}
</div>

{#if streakShow !== null}
  <Streak days={streakShow} onDone={() => (streakShow = null)} />
{/if}
