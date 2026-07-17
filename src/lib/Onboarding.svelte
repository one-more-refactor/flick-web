<script lang="ts">
  // Intro for freshly registered accounts (guests never land here). Two
  // steps — handle, speed — with a small but present SKIP (contract).
  import * as api from './api';
  import type { User } from './api';
  import { t } from './i18n.svelte';
  import { ONBOARD_DEMO_WORDS } from './demos';
  import RsvpDemo from './RsvpDemo.svelte';

  let {
    user,
    onDone,
  }: {
    user: User;
    onDone: (user: User) => void;
  } = $props();

  let step = $state(1);
  let busy = $state(false);
  let error = $state<string | null>(null);

  // ---- step 1: handle, prefilled from name or email local part ----
  function sanitize(s: string): string {
    return s.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24);
  }
  // Mounted once per un-onboarded user — capturing the initial user is intentional.
  // svelte-ignore state_referenced_locally
  let username = $state(sanitize(user.name) || sanitize(user.email?.split('@')[0] ?? ''));

  function usernameError(u: string): string | null {
    if (u.length < 2 || u.length > 24) return t('ob_handle_hint');
    if (!/^[a-zA-Z0-9_-]+$/.test(u)) return t('ob_handle_hint');
    return null;
  }
  const nameErr = $derived(usernameError(username));

  // ---- step 2: speed, chosen against a live word-stream ----
  // svelte-ignore state_referenced_locally
  let wpm = $state(Math.min(800, Math.max(150, Math.round(user.settings.wpm / 25) * 25)));

  async function finish(withProfile: boolean) {
    if (busy) return;
    busy = true;
    error = null;
    try {
      const updated = await api.updateMe(
        withProfile ? { username, settings: { wpm }, onboarded: true } : { onboarded: true },
      );
      onDone(updated);
    } catch (err) {
      error = err instanceof Error ? err.message : t('err_generic');
    } finally {
      busy = false;
    }
  }

  function next() {
    if (busy) return;
    error = null;
    if (step === 1) {
      if (nameErr) return;
      step = 2;
    } else {
      void finish(true);
    }
  }

  function submit(e: SubmitEvent) {
    e.preventDefault();
    next();
  }

  function autofocus(node: HTMLElement) {
    node.focus();
  }
</script>

<section class="onboard">
  <div class="wrap">
    <div class="step-k">{step} / 2</div>

    {#if step === 1}
      <h2>{t('ob_handle')}</h2>
      <form onsubmit={submit}>
        <div class="field">
          <input
            id="ob-username"
            type="text"
            bind:value={username}
            spellcheck="false"
            autocomplete="username"
            aria-label={t('ob_handle')}
            use:autofocus
          />
          <span class="fhint">{t('ob_handle_hint')}</span>
        </div>
      </form>
    {:else}
      <h2>{wpm} wpm</h2>
      <div class="demo">
        <RsvpDemo words={ONBOARD_DEMO_WORDS} {wpm} />
      </div>
      <div class="controls" style="border: 1px solid var(--line); border-top: none">
        <div class="wpm-wrap">
          <input
            type="range"
            min="150"
            max="800"
            step="25"
            bind:value={wpm}
            aria-label="Words per minute"
          />
          <div class="wpm-val"><b>{wpm}</b> wpm</div>
        </div>
      </div>
      <p class="fhint" style="color: var(--dim); font-size: 11px">{t('ob_speed_hint')}</p>
    {/if}

    {#if error}
      <div class="form-error" style="margin-top: 14px">{error}</div>
    {/if}

    <div class="obnav">
      {#if step > 1}
        <button class="linklike" type="button" onclick={() => (step = 1)} disabled={busy}>
          ← {t('ob_back')}
        </button>
      {:else}
        <button class="linklike" type="button" onclick={() => void finish(false)} disabled={busy}>
          {t('ob_skip')}
        </button>
      {/if}
      <button class="btn" type="button" onclick={next} disabled={busy || (step === 1 && !!nameErr)}>
        {step === 1 ? `${t('ob_next')} →` : busy ? `${t('working')}…` : `${t('ob_finish')} →`}
      </button>
    </div>
  </div>
</section>
