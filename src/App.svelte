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
  import Premium from './lib/Premium.svelte';
  import SharedLanding from './lib/SharedLanding.svelte';
  import Invite from './lib/Invite.svelte';
  import Wrapped from './lib/Wrapped.svelte';
  import DotNumber from './lib/DotNumber.svelte';
  import Reader from './lib/Reader.svelte';
  import Stats from './lib/Stats.svelte';
  import Streak from './lib/Streak.svelte';

  type View =
    | { name: 'boot' }
    | { name: 'landing' }
    | { name: 'auth' }
    | { name: 'onboarding' }
    | { name: 'library' }
    | { name: 'reader'; book: Book; timeline: Timeline; ephemeral?: boolean }
    | { name: 'stats' }
    | { name: 'premium' }
    | { name: 'shared'; token: string }
    | { name: 'invite' }
    | { name: 'wrapped' };

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

  // ---- top-bar streak chip (v0.5.1): the habit, front and center.
  // v0.6: click quarter-flips it (cube-style) between streak and today faces.
  let chip = $state<{ current: number; today: number; goal: number } | null>(null);
  let chipFlip = $state(0);
  // v0.7: referral status (FOMO squares + pro days) and running events.
  let refStat = $state<api.ReferralStatus | null>(null);
  let refEvent = $state<api.ActiveEvent | null>(null);

  api
    .activeEvents()
    .then((evs) => (refEvent = evs.find((e) => e.kind === 'referral') ?? null))
    .catch(() => {});

  function refreshChip() {
    api
      .stats()
      .then((s) => (chip = { current: s.streak.current, today: s.today.words, goal: s.goal }))
      .catch(() => {});
    if (user && !user.guest) {
      api.referral().then((s) => (refStat = s)).catch(() => {});
    }
    // A friend code picked up before there was a session applies now.
    const pending = localStorage.getItem('flick.friend');
    if (user && pending) {
      localStorage.removeItem('flick.friend');
      api.friendAdd(pending).catch(() => {});
    }
  }

  /** Adopt a user object: remember it and apply their settings app-wide. */
  function adopt(u: User) {
    user = u;
    themeState.adopt(u.settings);
    i18n.adopt(u.settings.lang);
    refreshChip();
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
      case 'premium':
        return { name: 'premium' };
      case 'shared':
        return { name: 'shared', token: v.token };
      case 'invite':
        return { name: 'invite' };
      case 'wrapped':
        return { name: 'wrapped' };
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
    if (route.name === 'premium') {
      view = { name: 'premium' };
      return;
    }
    if (route.name === 'shared') {
      view = { name: 'shared', token: route.token };
      return;
    }
    if (route.name === 'invite') {
      view = { name: 'invite' };
      return;
    }
    if (route.name === 'refland') {
      // /r/:code — remember the referrer, then act like the front door.
      try {
        localStorage.setItem('flick.ref', route.code);
      } catch {
        // storage unavailable — the visit still works
      }
      nav.replace({ name: 'home' });
      view = user ? { name: 'library' } : { name: 'landing' };
      return;
    }
    if (route.name === 'friendland') {
      if (user) {
        try {
          await api.friendAdd(route.code);
        } catch {
          // unknown/own code — nothing to do
        }
        nav.replace({ name: 'stats' });
        view = { name: 'stats' };
      } else {
        try {
          localStorage.setItem('flick.friend', route.code);
        } catch {
          // ignore
        }
        nav.replace({ name: 'home' });
        view = { name: 'landing' };
      }
      return;
    }
    if (route.name === 'wrapped') {
      view = user ? { name: 'wrapped' } : { name: 'landing' };
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
      const ref = localStorage.getItem('flick.ref') ?? undefined;
      const u = await api.guest(ref);
      if (ref) localStorage.removeItem('flick.ref');
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

  /** /s/:token → guest if needed → import the copy → straight into the reader. */
  async function onSharedStart(token: string) {
    const u = user ?? (await startGuest());
    if (!u) return;
    const book = await api.sharedImport(token);
    const tl = await api.timeline(book.id);
    onRead(book, tl);
  }

  /** Read-only share: play the public timeline ephemerally — no library copy,
   *  no position saved, no session logged (contract v0.8). */
  async function onSharedRead(token: string, info: api.SharedInfo) {
    const u = user ?? (await startGuest());
    if (!u) return;
    const tl = await api.sharedTimeline(token);
    const book: Book = {
      id: '',
      title: info.title,
      source: 'shared',
      word_count: info.word_count,
      position: 0,
      created_at: Math.floor(Date.now() / 1000),
      last_read_at: null,
      author: info.author,
      url: null,
      favicon: null,
      excerpt: null,
      category: info.category,
      tags: [],
    };
    view = { name: 'reader', book, timeline: tl, ephemeral: true };
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
    refreshChip();
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
    chip = null;
    themeState.detach();
    i18n.detach();
    go({ name: 'landing' }, 'replace');
  }

  const LANGS: Lang[] = ['auto', 'en', 'de', 'es'];

  const who = $derived(
    user ? (user.username ?? (user.guest ? t('guest') : (user.name || user.email))) : null,
  );
  const inReader = $derived(view.name === 'reader');

  // ---- per-route document titles (v0.5.1 brand polish) ----
  $effect(() => {
    document.title =
      view.name === 'reader'
        ? `${view.book.title} — flick`
        : view.name === 'stats'
          ? 'stats — flick'
          : view.name === 'premium'
            ? edition === 'hosted'
              ? 'premium — flick'
              : 'contribute — flick'
            : view.name === 'auth'
              ? 'sign in — flick'
              : view.name === 'shared'
                ? 'shared — flick'
                : view.name === 'invite'
                  ? 'invite — flick'
                  : view.name === 'wrapped'
                    ? 'wrapped — flick'
                    : 'flick — read it in a flick';
  });

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
  // ---- account menu (v0.8): the square avatar button opens it
  let acctOpen = $state(false);

  /** Remaining weekly uploads for the top-bar meter (hosted free plan only). */
  const uploadsLeft = $derived(
    edition === 'hosted' && user && user.uploads && user.uploads.limit !== null
      ? Math.max(0, user.uploads.limit - user.uploads.used)
      : null,
  );

  /** First glyph for the avatar placeholder when there's no picture. */
  const initial = $derived((who ?? '?').trim().charAt(0).toUpperCase() || '?');

  function onWindowClick(e: MouseEvent) {
    const el = e.target as Element | null;
    if (themesOpen && !el?.closest('.thpick')) themesOpen = false;
    if (acctOpen && !el?.closest('.acctwrap')) acctOpen = false;
  }

  function onWindowKey(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      themesOpen = false;
      acctOpen = false;
    }
  }

  /** Top-bar GO PREMIUM: the real premium page (v0.5.1). */
  function goPremium() {
    go({ name: 'premium' });
  }
</script>

<div class="page">
  <header class="top">
    <div class="wrap">
      <div class="navl">
        <button
          class="mark"
          type="button"
          onclick={() => {
            if (user) go({ name: 'library' });
          }}
          aria-label="flick"
        >FLICK<span class="cur">_</span></button>
        {#if edition === 'hosted'}
          {#if user && user.pro_active}
            <button class="probadge" type="button" onclick={() => go({ name: 'invite' })} title="PRO">
              PRO<span class="cur">_</span>
              {#if (user.pro_days ?? 0) > 0 && user.plan !== 'pro'}
                <i class="prodays">{user.pro_days}d</i>
              {/if}
            </button>
            {#if refStat && refStat.qualified > 0}
              <button
                class="invrow"
                type="button"
                title="{refStat.qualified} {t('inv_qualified')}"
                onclick={() => go({ name: 'invite' })}
              >
                {#each Array.from({ length: Math.min(8, refStat.qualified) }) as _, i (i)}
                  <b>▪</b>
                {/each}
              </button>
            {/if}
          {:else if refEvent && user}
            <button class="evchip" type="button" onclick={() => go({ name: 'invite' })}>
              {t('ev_invite')}
            </button>
          {:else}
            <button class="link brk premium" type="button" onclick={goPremium}>
              {t('go_premium')}
            </button>
          {/if}
        {/if}
      </div>
      <div class="navr">
        {#if user && chip && chip.current > 0}
          <button
            class="schip"
            class:done={chip.today >= chip.goal}
            type="button"
            title={chip.today >= chip.goal ? t('chip_done') : t('chip_risk')}
            aria-label="{chip.current} {t('day_streak_k')}"
            onclick={() => (chipFlip += 1)}
          >
            <span class="schipbox" style="--flip:{chipFlip}">
              <span class="sface f0">
                <DotNumber value={chip.current} grid={2.4} />
                <span class="scur">{chip.today >= chip.goal ? '.' : '_'}</span>
              </span>
              <span class="sface f1">
                <b>{Math.min(100, Math.round((chip.today / chip.goal) * 100))}%</b>
                <span class="stlab">{t('goal_today')}</span>
              </span>
            </span>
          </button>
        {/if}
        {#if uploadsLeft !== null}
          <button
            class="uptop"
            type="button"
            onclick={goPremium}
            title="{uploadsLeft} {t('uploads_left')}"
            aria-label="{uploadsLeft} {t('uploads_left')}"
          >
            <span class="upn">{uploadsLeft}</span>
            <span class="uparr">↑</span>
            <span class="upmeter" aria-hidden="true">
              <i style="width: {Math.min(100, ((user?.uploads?.used ?? 0) / (user?.uploads?.limit || 1)) * 100)}%"></i>
            </span>
          </button>
        {/if}
        <a class="link brk ghbtn" href={REPO} target="_blank" rel="noopener">
          <span class="ghstar" aria-hidden="true">★</span>GITHUB<span class="x">↗</span>
        </a>
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
            <span class="thcar" class:open={themesOpen} aria-hidden="true">▾</span>
          </button>
          {#if themesOpen}
            <div class="thpanel">
              {#each THEME_NAMES as th, i (th)}
                <button
                  class="throw"
                  class:on={themeState.theme === th}
                  style="--i:{i}"
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
          <div class="acctwrap">
            <button
              class="avatarbtn"
              type="button"
              onclick={() => (acctOpen = !acctOpen)}
              aria-expanded={acctOpen}
              aria-label={t('account_k')}
              title={who}
            >
              {#if user.avatar}
                <img class="avimg" src={user.avatar} alt="" />
              {:else}
                <span class="avinit">{initial}</span>
              {/if}
            </button>
            {#if acctOpen}
              <div class="acctmenu">
                <div class="acchead">@<b>{who}</b></div>
                <button class="accitem" type="button" onclick={() => { acctOpen = false; go({ name: 'stats' }); }}>
                  {t('stats_link')}
                </button>
                {#if edition === 'hosted'}
                  <button class="accitem" type="button" onclick={() => { acctOpen = false; go({ name: 'invite' }); }}>
                    {t('inv_head')}
                  </button>
                {/if}
                <button class="accitem out" type="button" onclick={() => { acctOpen = false; onLogout(); }}>
                  {t('logout')}
                </button>
              </div>
            {/if}
          </div>
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
            onInvite={() => go({ name: 'invite' })}
          />
        {:else if view.name === 'reader' && user}
          <Reader
            book={view.book}
            timeline={view.timeline}
            {user}
            {onExit}
            {onWpm}
            ephemeral={view.ephemeral ?? false}
          />
        {:else if view.name === 'stats' && user}
          <Stats onBack={() => go({ name: 'library' })} onWrapped={() => go({ name: 'wrapped' })} />
        {:else if view.name === 'premium'}
          <Premium
            {edition}
            onBack={() => go(user ? { name: 'library' } : { name: 'landing' })}
          />
        {:else if view.name === 'shared'}
          <SharedLanding
            token={view.token}
            onStart={onSharedStart}
            onRead={onSharedRead}
            onBack={() => go(user ? { name: 'library' } : { name: 'landing' })}
          />
        {:else if view.name === 'invite'}
          <Invite
            {user}
            onBack={() => go(user ? { name: 'library' } : { name: 'landing' })}
            onAuth={() => go({ name: 'auth' })}
          />
        {:else if view.name === 'wrapped'}
          <Wrapped onBack={() => go({ name: 'stats' })} />
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
