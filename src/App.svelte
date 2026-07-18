<script lang="ts">
  import { untrack } from 'svelte';
  import * as api from './lib/api';
  import type { Book, Lang, Timeline, User } from './lib/api';
  import { REPO } from './lib/consts';
  import { themeState, THEME_NAMES, THEME_SWATCH } from './lib/theme.svelte';
  import { i18n, t } from './lib/i18n.svelte';
  import * as nav from './lib/nav';
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
  let edition = $state<'selfhost' | 'hosted'>('selfhost');
  let starting = $state(false);
  let streakShow = $state<number | null>(null);

  api
    .meta()
    .then((m) => (edition = m.edition))
    .catch(() => {
      // pre-v0.4 server — selfhost default keeps Pro surfaces hidden
    });

  // Any 401 from a non-auth endpoint means the session is gone — back to the door.
  api.setUnauthorizedHandler(() => {
    user = null;
    go({ name: 'landing' }, 'replace');
  });

  /** Adopt a user object: remember it and apply their settings app-wide. */
  function adopt(u: User) {
    user = u;
    themeState.adopt(u.settings);
    i18n.adopt(u.settings.lang);
  }

  // ---- view ⇄ URL sync (CONTRACTS v0.4: real URLs, working back button) ----

  function routeFor(v: View): nav.Route {
    switch (v.name) {
      case 'reader':
        return { name: 'read', id: v.book.id };
      case 'stats':
        return { name: 'stats' };
      case 'auth':
        return { name: 'auth' };
      default:
        return { name: 'home' };
    }
  }

  /** Switch view and record it in history ('push' for user navigation). */
  function go(v: View, how: 'push' | 'replace' = 'push') {
    view = v;
    if (how === 'push') nav.push(routeFor(v));
    else nav.replace(routeFor(v));
  }

  /** The view the URL asks for, given the current session. */
  async function applyRoute(route: nav.Route) {
    if (route.name === 'auth') {
      view = { name: 'auth' };
      return;
    }
    if (!user) {
      view = { name: 'landing' };
      return;
    }
    switch (route.name) {
      case 'home':
        view = user.guest || user.onboarded ? { name: 'library' } : { name: 'onboarding' };
        break;
      case 'stats':
        view = { name: 'stats' };
        break;
      case 'read': {
        if (view.name === 'reader' && view.book.id === route.id) return;
        try {
          const [book, timeline] = await Promise.all([
            api.book(route.id),
            api.timeline(route.id),
          ]);
          startReading(book, timeline);
        } catch {
          view = { name: 'library' };
          nav.replace({ name: 'home' });
        }
        break;
      }
    }
  }

  nav.onPop((route) => void applyRoute(route));

  async function boot() {
    try {
      adopt(await api.me());
    } catch {
      user = null;
    }
    await applyRoute(nav.parsePath(location.pathname));
    if (view.name === 'boot') view = user ? { name: 'library' } : { name: 'landing' };
  }
  boot();

  // ---- guest-first entries ----

  /** "Start reading" needs no account — mint a guest session lazily. */
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
    if (u) go({ name: 'library' });
  }

  /** Landing catalog pick: session (guest if needed) → open the pre-seeded
   *  copy (409 carries its id, contract v0.4.1) or add-then-open. */
  async function onPick(slug: string) {
    const u = await startGuest();
    if (!u) return;
    try {
      const added = await api.catalogAdd(slug);
      const [fresh, tl] = await Promise.all([api.book(added.id), api.timeline(added.id)]);
      onRead(fresh, tl);
    } catch (err) {
      if (err instanceof api.ApiError && err.status === 409 && err.bookId) {
        try {
          const [fresh, tl] = await Promise.all([api.book(err.bookId), api.timeline(err.bookId)]);
          onRead(fresh, tl);
          return;
        } catch {
          // fall through to the library
        }
      }
      go({ name: 'library' });
    }
  }

  /** Landing quick-read: drop a file → guest → import → reader, one gesture. */
  let quickErr = $state<string | null>(null);
  async function onQuickFile(file: File) {
    quickErr = null;
    const u = await startGuest();
    if (!u) return;
    try {
      const book = await api.createBookFromFile(file);
      const tl = await api.timeline(book.id);
      onRead(book, tl);
    } catch (err) {
      quickErr = err instanceof Error ? err.message : t('err_generic');
      go({ name: 'library' });
    }
  }

  function onAuthed(u: User) {
    adopt(u);
    go(u.guest || u.onboarded ? { name: 'library' } : { name: 'onboarding' }, 'replace');
  }

  function onOnboarded(u: User) {
    adopt(u);
    go({ name: 'library' }, 'replace');
  }

  // ---- streak detection: words-before vs words-after a reading session ----
  let preWords = $state<number | null>(null);

  function startReading(book: Book, timeline: Timeline) {
    view = { name: 'reader', book, timeline };
    preWords = null;
    api
      .stats()
      .then((s) => (preWords = s.today.words))
      .catch(() => {});
  }

  function onRead(book: Book, timeline: Timeline) {
    startReading(book, timeline);
    nav.push({ name: 'read', id: book.id });
  }

  function onExit() {
    go({ name: 'library' });
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
    go({ name: 'landing' }, 'replace');
  }

  const LANGS: Lang[] = ['auto', 'en', 'de'];

  const who = $derived(
    user ? (user.username ?? (user.guest ? t('guest') : (user.name || user.email))) : null,
  );
  const inReader = $derived(view.name === 'reader');

  // ---- flip cube: a quarter-turn forward per flick; the visible face always
  // matches the resolved mode (re-syncs if the system theme flips it).
  let spin = $state(themeState.resolved === 'dark' ? 1 : 0);
  $effect(() => {
    const dark = themeState.resolved === 'dark';
    untrack(() => {
      if (spin % 2 === 1 !== dark) spin += 1;
    });
  });

  // ---- theme picker popover (moved out of the footer, v0.4.2)
  let themesOpen = $state(false);

  function onWindowClick(e: MouseEvent) {
    if (themesOpen && !(e.target as Element | null)?.closest('.thpick')) themesOpen = false;
  }

  function onWindowKey(e: KeyboardEvent) {
    if (e.key === 'Escape') themesOpen = false;
  }

  /** Top-bar GO PREMIUM (hosted only): land on the plans strip. */
  function goPremium() {
    if (view.name !== 'landing') go({ name: 'landing' });
    setTimeout(
      () =>
        document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      60,
    );
  }
</script>

<div class="page">
  <header class="top">
    <div class="wrap">
      <button
        class="mark"
        type="button"
        onclick={() => {
          if (user) go({ name: 'library' });
        }}
        aria-label="flick"
      >FLICK<span class="cur">_</span></button>
      <div class="navr">
        <a class="link brk" href={REPO} target="_blank" rel="noopener">GITHUB<span class="x">↗</span></a>
        {#if edition === 'hosted'}
          <button class="link brk premium" type="button" onclick={goPremium}>
            {t('go_premium')}
          </button>
        {/if}
        <div class="thpick">
          <button
            class="thbtn"
            type="button"
            onclick={() => (themesOpen = !themesOpen)}
            aria-expanded={themesOpen}
            aria-label={t('theme')}
            title={t('theme')}
          >
            <span class="swd" style="--c:{THEME_SWATCH[themeState.theme]}"></span>
            <span class="thname">{themeState.theme.toUpperCase()}</span>
          </button>
          {#if themesOpen}
            <div class="thpanel">
              {#each THEME_NAMES as th (th)}
                <button
                  class="throw"
                  class:on={themeState.theme === th}
                  type="button"
                  onclick={() => {
                    themeState.setTheme(th);
                    themesOpen = false;
                  }}
                >
                  <span class="swd" style="--c:{THEME_SWATCH[th]}"></span>{th.toUpperCase()}
                </button>
              {/each}
            </div>
          {/if}
        </div>
        <button
          class="cube"
          type="button"
          onclick={() => themeState.flick()}
          title="light / dark"
          aria-label="light / dark"
        >
          <span class="cubebox" style="--spin:{spin}">
            <span class="face f0" aria-hidden="true">LIGHT</span>
            <span class="face f1" aria-hidden="true">DARK</span>
            <span class="face f2" aria-hidden="true">LIGHT</span>
            <span class="face f3" aria-hidden="true">DARK</span>
          </span>
        </button>
        {#if user?.guest}
          <button class="acct" type="button" onclick={() => go({ name: 'auth' })}>
            {t('create_account')}
          </button>
        {:else if user}
          <button class="link" type="button" onclick={onLogout}>{t('logout')}</button>
        {:else if view.name !== 'auth'}
          <button class="link loginlink" type="button" onclick={() => go({ name: 'auth' })}>
            {t('login')}
          </button>
          <button class="acct" type="button" onclick={() => go({ name: 'auth' })}>
            {t('create_account')}
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
          <Landing
            {onStart}
            onLogin={() => go({ name: 'auth' })}
            {onPick}
            {onQuickFile}
            {edition}
            {starting}
            error={quickErr}
          />
        {:else if view.name === 'auth'}
          <Auth
            {onAuthed}
            guest={user?.guest ?? false}
            onBack={() => go(user ? { name: 'library' } : { name: 'landing' })}
          />
        {:else if view.name === 'onboarding' && user}
          <Onboarding {user} onDone={onOnboarded} />
        {:else if view.name === 'library' && user}
          <Library
            {user}
            {who}
            {edition}
            {onRead}
            onStats={() => go({ name: 'stats' })}
            onAuth={() => go({ name: 'auth' })}
          />
        {:else if view.name === 'reader' && user}
          <Reader book={view.book} timeline={view.timeline} {user} {onExit} {onWpm} />
        {:else if view.name === 'stats' && user}
          <Stats onBack={() => go({ name: 'library' })} />
        {/if}
      </div>
    {/key}
  </main>

  {#if !inReader}
    <footer class="app">
      <div class="wrap">
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

<svelte:window onclick={onWindowClick} onkeydown={onWindowKey} />

{#if streakShow !== null}
  <Streak days={streakShow} onDone={() => (streakShow = null)} />
{/if}
