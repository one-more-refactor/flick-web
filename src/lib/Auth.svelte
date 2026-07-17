<script lang="ts">
  // Email-first auth (CONTRACTS.md): one email field + SSO buttons up front.
  // Lookup forks to password (known account) or register (new). Email codes
  // sign into existing accounts. Guest libraries merge server-side on success.
  import * as api from './api';
  import type { Provider, User } from './api';
  import { t } from './i18n.svelte';

  let {
    onAuthed,
    onBack,
  }: {
    onAuthed: (user: User) => void;
    onBack: () => void;
  } = $props();

  type Step = 'email' | 'password' | 'register' | 'code';
  let step = $state<Step>('email');
  let email = $state('');
  let password = $state('');
  let name = $state('');
  let code = $state('');
  let methods = $state<string[]>([]);
  let providers = $state<Provider[]>([]);
  let busy = $state(false);
  let codeSent = $state(false);
  let error = $state<string | null>(null);

  api
    .providers()
    .then((p) => (providers = p))
    .catch(() => {
      // SSO buttons stay hidden when the endpoint is unavailable
    });

  /** Providers connected to this account AND configured on this server. */
  const connected = $derived(providers.filter((p) => methods.includes(p.id)));

  function message(err: unknown): string {
    return err instanceof Error ? err.message : t('err_generic');
  }

  function go(next: Step) {
    step = next;
    error = null;
  }

  async function submitEmail(e: SubmitEvent) {
    e.preventDefault();
    if (busy || !email.trim()) return;
    busy = true;
    error = null;
    try {
      const found = await api.lookup(email);
      methods = found.methods;
      if (!found.exists) go('register');
      else if (found.methods.includes('password')) go('password');
      else {
        // SSO/code-only account
        go('code');
        codeSent = false;
      }
    } catch (err) {
      error = message(err);
    } finally {
      busy = false;
    }
  }

  async function submitLogin(e: SubmitEvent) {
    e.preventDefault();
    if (busy) return;
    busy = true;
    error = null;
    try {
      onAuthed(await api.login(email, password));
    } catch (err) {
      error = message(err);
    } finally {
      busy = false;
    }
  }

  async function submitRegister(e: SubmitEvent) {
    e.preventDefault();
    if (busy) return;
    busy = true;
    error = null;
    try {
      onAuthed(await api.register(email, password, name.trim() || undefined));
    } catch (err) {
      error = message(err);
    } finally {
      busy = false;
    }
  }

  async function requestCode() {
    if (busy) return;
    busy = true;
    error = null;
    try {
      await api.codeRequest(email);
      go('code');
      codeSent = true;
    } catch (err) {
      error = message(err);
    } finally {
      busy = false;
    }
  }

  async function submitCode(e: SubmitEvent) {
    e.preventDefault();
    if (busy) return;
    busy = true;
    error = null;
    try {
      onAuthed(await api.codeVerify(email, code));
    } catch (err) {
      error = message(err);
    } finally {
      busy = false;
    }
  }

  function autofocus(node: HTMLElement) {
    node.focus();
  }
</script>

<section class="auth">
  <div class="wrap">
    {#if step === 'email'}
      <p class="head">FLICK<b>_</b></p>
      <form onsubmit={submitEmail}>
        <div class="field">
          <label for="auth-email">{t('auth_email')}</label>
          <input
            id="auth-email"
            type="email"
            bind:value={email}
            required
            autocomplete="email"
            spellcheck="false"
            use:autofocus
          />
        </div>
        {#if error}<div class="form-error">{error}</div>{/if}
        <button class="btn" type="submit" disabled={busy}>
          {busy ? `${t('working')}…` : `${t('auth_continue')} →`}
        </button>
      </form>
      {#if providers.length > 0}
        <div class="or" style="margin-top: 18px">{t('auth_or')}</div>
        <div class="providers">
          {#each providers as p (p.id)}
            <a class="btn ghost" style="text-align:center" href={api.oauthLoginUrl(p.id)}>
              {t('auth_with')} {p.name} →
            </a>
          {/each}
        </div>
      {/if}
      <div class="navline">
        <button class="linklike" type="button" onclick={onBack}>← {t('auth_back')}</button>
      </div>
    {:else if step === 'password'}
      <p class="head"><b>{email}</b></p>
      <form onsubmit={submitLogin}>
        <div class="field">
          <label for="auth-password">{t('auth_password')}</label>
          <input
            id="auth-password"
            type="password"
            bind:value={password}
            required
            autocomplete="current-password"
            use:autofocus
          />
        </div>
        {#if error}<div class="form-error">{error}</div>{/if}
        <button class="btn" type="submit" disabled={busy}>
          {busy ? `${t('working')}…` : `${t('auth_signin')} →`}
        </button>
      </form>
      {#if connected.length > 0}
        <div class="providers">
          {#each connected as p (p.id)}
            <a class="btn ghost" style="text-align:center" href={api.oauthLoginUrl(p.id)}>
              {t('auth_with')} {p.name} →
            </a>
          {/each}
        </div>
      {/if}
      <div class="navline">
        <button class="linklike" type="button" onclick={() => go('email')}>← {t('auth_back')}</button>
        <button class="linklike" type="button" onclick={requestCode} disabled={busy}>
          {t('auth_code_send')}
        </button>
      </div>
    {:else if step === 'register'}
      <p class="head">{t('auth_new_here')} · <b>{email}</b></p>
      <form onsubmit={submitRegister}>
        <div class="field">
          <label for="reg-password">{t('auth_password')}</label>
          <input
            id="reg-password"
            type="password"
            bind:value={password}
            required
            minlength="8"
            autocomplete="new-password"
            use:autofocus
          />
          <span class="fhint">{t('auth_password_hint')}</span>
        </div>
        <div class="field">
          <label for="reg-name">{t('auth_name_opt')}</label>
          <input id="reg-name" type="text" bind:value={name} autocomplete="name" />
        </div>
        {#if error}<div class="form-error">{error}</div>{/if}
        <button class="btn" type="submit" disabled={busy}>
          {busy ? `${t('working')}…` : `${t('auth_create')} →`}
        </button>
      </form>
      <div class="navline">
        <button class="linklike" type="button" onclick={() => go('email')}>← {t('auth_back')}</button>
      </div>
    {:else}
      <p class="head"><b>{email}</b></p>
      {#if !codeSent}
        <button class="btn" type="button" onclick={requestCode} disabled={busy}>
          {busy ? `${t('working')}…` : `${t('auth_code_send')} →`}
        </button>
      {:else}
        <p class="status" style="margin: 0 0 16px">{t('auth_code_sent')}</p>
        <form onsubmit={submitCode}>
          <div class="field">
            <label for="auth-code">{t('auth_code_label')}</label>
            <input
              id="auth-code"
              type="text"
              inputmode="numeric"
              pattern="[0-9]*"
              maxlength="6"
              bind:value={code}
              required
              autocomplete="one-time-code"
              use:autofocus
            />
          </div>
          {#if error}<div class="form-error">{error}</div>{/if}
          <button class="btn" type="submit" disabled={busy || code.trim().length !== 6}>
            {busy ? `${t('working')}…` : `${t('auth_code_verify')} →`}
          </button>
        </form>
      {/if}
      <div class="navline">
        <button
          class="linklike"
          type="button"
          onclick={() => go(methods.includes('password') ? 'password' : 'email')}
        >← {t('auth_back')}</button>
      </div>
    {/if}
  </div>
</section>
