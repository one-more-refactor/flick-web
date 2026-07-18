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

  // ---- optional profile picture (v0.8): downscaled to a small square data URL ----
  let avatar = $state<string | null>(null);
  let avInput: HTMLInputElement | undefined = $state();

  /** Center-crop + downscale to a `size`×`size` JPEG data URL (well under cap). */
  function squareDataUrl(file: File, size: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const s = Math.min(img.width, img.height);
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('no canvas'));
        ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('bad image'));
      };
      img.src = url;
    });
  }

  async function pickAvatar(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      avatar = await squareDataUrl(file, 160);
    } catch {
      error = t('err_generic');
    }
  }

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
  const initial = $derived((username || '?').trim().charAt(0).toUpperCase() || '?');

  // ---- step 2: speed, chosen against a live word-stream ----
  // svelte-ignore state_referenced_locally
  let wpm = $state(Math.min(800, Math.max(150, Math.round(user.settings.wpm / 25) * 25)));

  async function finish(withProfile: boolean) {
    if (busy) return;
    busy = true;
    error = null;
    try {
      const base = withProfile
        ? { username, settings: { wpm }, onboarded: true }
        : { onboarded: true };
      const updated = await api.updateMe(
        withProfile && avatar ? { ...base, avatar } : base,
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
      <div class="obavatar">
        <button class="avpick" type="button" onclick={() => avInput?.click()} aria-label={t('ob_avatar')}>
          {#if avatar}<img src={avatar} alt="" />{:else}<span>{initial}</span>{/if}
        </button>
        <div class="avmeta">
          <div class="avlab">{t('ob_avatar')}</div>
          <div class="avactions">
            <button class="linklike" type="button" onclick={() => avInput?.click()}>
              {t('ob_avatar_pick')}
            </button>
            {#if avatar}
              <button class="linklike" type="button" onclick={() => (avatar = null)}>
                {t('ob_avatar_remove')}
              </button>
            {/if}
          </div>
          <div class="fhint">{t('ob_avatar_hint')}</div>
        </div>
        <input type="file" accept="image/*" hidden bind:this={avInput} onchange={pickAvatar} />
      </div>
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
