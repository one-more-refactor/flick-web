<script lang="ts">
  import * as api from './api';
  import type { OidcProvider, User } from './api';

  let { onAuthed }: { onAuthed: (user: User) => void } = $props();

  let mode = $state<'login' | 'register'>('login');
  let email = $state('');
  let password = $state('');
  let name = $state('');
  let error = $state<string | null>(null);
  let busy = $state(false);
  let oidc = $state<OidcProvider | null>(null);

  api
    .providers()
    .then((p) => {
      if (p.oidc?.enabled) oidc = p.oidc;
    })
    .catch(() => {
      // no providers endpoint (yet) — SSO button stays hidden
    });

  function switchMode() {
    mode = mode === 'login' ? 'register' : 'login';
    error = null;
  }

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    if (busy) return;
    error = null;
    busy = true;
    try {
      const user =
        mode === 'login'
          ? await api.login(email, password)
          : await api.register(email, password, name);
      onAuthed(user);
    } catch (err) {
      error = err instanceof Error ? err.message : 'request failed';
    } finally {
      busy = false;
    }
  }
</script>

<section class="panel" aria-label="Account">
  <div class="panel-label">
    <span class="lbl">{mode === 'login' ? 'Sign in' : 'Register'}</span>
    <span class="counter">v0.1</span>
  </div>

  <form class="form" onsubmit={submit}>
    {#if mode === 'register'}
      <div class="field">
        <label for="auth-name">Name</label>
        <input id="auth-name" type="text" bind:value={name} required autocomplete="name" />
      </div>
    {/if}
    <div class="field">
      <label for="auth-email">Email</label>
      <input id="auth-email" type="email" bind:value={email} required autocomplete="email" />
    </div>
    <div class="field">
      <label for="auth-password">Password</label>
      <input
        id="auth-password"
        type="password"
        bind:value={password}
        required
        autocomplete={mode === 'login' ? 'current-password' : 'new-password'}
      />
    </div>

    {#if error}
      <div class="form-error">err — {error}</div>
    {/if}

    <button class="btn" type="submit" disabled={busy}>
      {busy ? 'working…' : mode === 'login' ? 'Sign in' : 'Create account'}
    </button>

    {#if oidc}
      <div class="or">— or —</div>
      <button
        class="btn ghost"
        type="button"
        onclick={() => {
          location.href = api.oidcLoginUrl;
        }}
      >
        {oidc.name} →
      </button>
    {/if}
  </form>

  <div class="hint">
    {#if mode === 'login'}
      <span>no account · <button class="linklike" type="button" onclick={switchMode}>register</button></span>
    {:else}
      <span>have an account · <button class="linklike" type="button" onclick={switchMode}>sign in</button></span>
    {/if}
  </div>
</section>
