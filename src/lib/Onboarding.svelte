<script lang="ts">
  import * as api from './api';
  import type { Theme, User } from './api';
  import { applyTheme } from './theme';
  import { ONBOARD_DEMO_WORDS } from './demos';
  import RsvpDemo from './RsvpDemo.svelte';

  let {
    user,
    onDone,
    onLogout,
  }: {
    user: User;
    onDone: (user: User) => void;
    onLogout: () => void;
  } = $props();

  const STEPS = ['USERNAME', 'SPEED', 'THEME'] as const;
  let step = $state(1);
  let busy = $state(false);
  let error = $state<string | null>(null);

  // ---- step 1: username, prefilled from name or email local part ----
  function sanitize(s: string): string {
    return s.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24);
  }
  // Mounted once per un-onboarded user — capturing the initial user is intentional.
  // svelte-ignore state_referenced_locally
  let username = $state(sanitize(user.name) || sanitize(user.email.split('@')[0]));

  function usernameError(u: string): string | null {
    if (u.length < 2) return 'too short — 2–24 chars';
    if (u.length > 24) return 'too long — 2–24 chars';
    if (!/^[a-zA-Z0-9_-]+$/.test(u)) return 'only a–z, 0–9, _ and -';
    return null;
  }
  const nameErr = $derived(usernameError(username));

  // ---- step 2: speed, chosen against a live word-stream ----
  // svelte-ignore state_referenced_locally
  let wpm = $state(Math.min(800, Math.max(150, Math.round(user.settings.wpm / 25) * 25)));
  function bump(delta: number) {
    wpm = Math.min(800, Math.max(150, wpm + delta));
  }

  // ---- step 3: theme with instant live preview ----
  const THEME_OPTIONS: Theme[] = ['auto', 'light', 'dark'];
  // svelte-ignore state_referenced_locally
  let theme = $state<Theme>(user.settings.theme);
  function pick(t: Theme) {
    theme = t;
    applyTheme(t); // live preview — data-theme on the root, auto removes it
  }

  function back() {
    if (busy) return;
    error = null;
    step = Math.max(1, step - 1);
  }

  async function next() {
    if (busy) return;
    error = null;
    if (step === 1) {
      if (nameErr) return;
      step = 2;
    } else if (step === 2) {
      step = 3;
    } else {
      // Finish: ONE PATCH with everything, then into the library.
      busy = true;
      try {
        const updated = await api.updateMe({
          username,
          settings: { wpm, theme },
          onboarded: true,
        });
        onDone(updated);
      } catch (err) {
        error = err instanceof Error ? err.message : 'request failed';
      } finally {
        busy = false;
      }
    }
  }

  function submit(e: SubmitEvent) {
    e.preventDefault();
    void next();
  }

  function autofocus(node: HTMLElement) {
    node.focus();
  }

  // No Escape handler on purpose: onboarding cannot be skipped.
  function onKey(e: KeyboardEvent) {
    if (e.key !== 'Enter' || busy) return;
    const t = e.target as HTMLElement | null;
    // buttons already act on Enter; the step-1 form submits itself
    if (t && (t.tagName === 'BUTTON' || t.tagName === 'INPUT')) return;
    void next();
  }
</script>

<svelte:window onkeydown={onKey} />

<section class="panel onboard" aria-label="First run setup">
  <div class="panel-label">
    <span class="lbl">First run</span>
    <span class="counter">setup {step}/3</span>
  </div>

  <div class="boot-line">
    [{step}/3] {STEPS[step - 1]}<span class="cursor">_</span>
  </div>

  {#if step === 1}
    <form class="form" onsubmit={submit}>
      <div class="field">
        <label for="ob-username">Pick a handle</label>
        <input
          id="ob-username"
          type="text"
          bind:value={username}
          spellcheck="false"
          autocomplete="username"
          use:autofocus
        />
        {#if nameErr && username.length > 0}
          <div class="form-error">err — {nameErr}</div>
        {/if}
      </div>
      <div class="ob-copy">shown in the header next to your stats · 2–24 chars · a–z 0–9 _ -</div>
    </form>
  {:else if step === 2}
    <RsvpDemo words={ONBOARD_DEMO_WORDS} {wpm} />
    <div class="controls">
      <button class="btn ghost step-btn" type="button" onclick={() => bump(-25)} aria-label="Slower">−</button>
      <div class="wpm-wrap">
        <input type="range" min="150" max="800" step="25" bind:value={wpm} aria-label="Words per minute" />
        <div class="wpm-val"><b>{wpm}</b> wpm</div>
      </div>
      <button class="btn ghost step-btn" type="button" onclick={() => bump(25)} aria-label="Faster">+</button>
    </div>
    <div class="ob-copy">speed up until it just barely breaks, then back off.</div>
  {:else}
    <div class="theme-grid" role="radiogroup" aria-label="Theme">
      {#each THEME_OPTIONS as t (t)}
        <button
          class="theme-opt"
          class:sel={theme === t}
          type="button"
          role="radio"
          aria-checked={theme === t}
          onclick={() => pick(t)}
        >
          {t}
        </button>
      {/each}
    </div>
    <div class="ob-copy">auto follows your system. changes apply instantly.</div>
  {/if}

  {#if error}
    <div class="status err">err — {error}</div>
  {/if}

  <div class="ob-nav">
    {#if step > 1}
      <button class="btn ghost" type="button" onclick={back} disabled={busy}>← back</button>
    {:else}
      <span></span>
    {/if}
    <button
      class="btn"
      type="button"
      onclick={() => void next()}
      disabled={busy || (step === 1 && !!nameErr)}
    >
      {step < 3 ? 'next →' : busy ? 'saving…' : 'finish →'}
    </button>
  </div>

  <div class="hint">
    <span><b>enter</b> next · no skipping</span>
    <button class="linklike" type="button" onclick={onLogout}>logout →</button>
  </div>
</section>
