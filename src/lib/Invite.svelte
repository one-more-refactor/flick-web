<script lang="ts">
  // The invite page (contract v0.7, route /invite): your link, the FOMO row
  // of invited people, the event countdown, the rules. Guests get the
  // create-account nudge (credits need somewhere to live).
  import * as api from './api';
  import type { ReferralStatus, User } from './api';
  import { t } from './i18n.svelte';

  let {
    user,
    onBack,
    onAuth,
  }: {
    user: User | null;
    onBack: () => void;
    onAuth: () => void;
  } = $props();

  let status = $state<ReferralStatus | null>(null);
  let error = $state<string | null>(null);
  let copied = $state(false);

  const isGuest = $derived(!user || user.guest);

  $effect(() => {
    if (isGuest) return;
    api
      .referral()
      .then((s) => (status = s))
      .catch((e) => (error = e instanceof Error ? e.message : t('err_generic')));
  });

  async function copy() {
    if (!status) return;
    try {
      await navigator.clipboard.writeText(`${location.origin}${status.path}`);
      copied = true;
      setTimeout(() => (copied = false), 1800);
    } catch {
      // clipboard unavailable — the link is still visible below
    }
  }

  function daysLeft(ends: number): number {
    return Math.max(0, Math.ceil((ends - Date.now() / 1000) / 86_400));
  }
</script>

<div class="wrap inviteview">
  <div class="head">
    <button class="backbtn" type="button" onclick={onBack}>← {t('library_link')}</button>
    <span class="cap">INVITE_</span>
  </div>

  <div class="premhero fadeup">
    <p class="chead">{t('inv_head')}</p>
    <p class="psub">{t('inv_sub')}</p>
  </div>

  {#if isGuest}
    <div class="sharecard fadeup">
      <p class="sgone">{t('auth_pitch')}</p>
      <button class="btn" type="button" onclick={onAuth}>{t('create_account')} →</button>
    </div>
  {:else if error}
    <div class="status err">{error}</div>
  {:else if !status}
    <div class="status">{t('loading')}<span class="cur">_</span></div>
  {:else}
    {#if status.event}
      <div class="evbanner">
        <b>{status.event.title}</b>
        <span>{t('inv_ends')} {daysLeft(status.event.ends_at)} {t('inv_days')}</span>
      </div>
    {:else}
      <div class="evbanner off">{t('inv_none')}</div>
    {/if}

    <div class="invlink">
      <code>{location.origin}{status.path}</code>
      <button class="btn" type="button" onclick={copy}>
        {copied ? `✓ ${t('link_copied')}` : `${t('inv_copy')} →`}
      </button>
    </div>

    <div class="invpeople">
      {#each Array.from({ length: status.qualified }) as _, i (`q${i}`)}
        <span class="pv done" title={t('inv_qualified')}>▪</span>
      {/each}
      {#each Array.from({ length: status.pending }) as _, i (`p${i}`)}
        <span class="pv" title={t('inv_pending')}>▫</span>
      {/each}
      {#if status.invited === 0}
        <span class="pv hint">▫▫▫</span>
      {/if}
      <span class="pl">
        <b>{status.qualified}</b> {t('inv_qualified')} · {status.pending}
        {t('inv_pending')}
      </span>
    </div>

    <div class="premfaq">
      <div class="faq" style="--i:0">
        <div class="fq">{t('inv_qualified')}?</div>
        <div class="fa">
          {t('inv_sub')}
        </div>
      </div>
      <div class="faq" style="--i:1">
        <div class="fq">{t('prem_q1')}</div>
        <div class="fa">{t('prem_a1')}</div>
      </div>
    </div>
  {/if}
</div>
