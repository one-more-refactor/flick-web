<script lang="ts">
  // The real premium page (contract v0.5.1): hosted = FREE/PRO comparison +
  // FAQ, framed as supporting an indie open-source project; selfhost = the
  // CONTRIBUTE page (everything is already yours). Route: /premium.
  import { REPO } from './consts';
  import { t } from './i18n.svelte';
  import DotNumber from './DotNumber.svelte';

  let {
    edition = 'selfhost',
    onBack,
  }: {
    edition?: 'selfhost' | 'hosted';
    onBack: () => void;
  } = $props();

  const ROWS = $derived([
    { label: t('f_reader'), free: true, pro: true },
    { label: t('f_imports'), free: true, pro: true },
    { label: t('f_storage'), free: true, pro: true },
    { label: `${t('f_uploads_free')} / ${t('f_uploads_pro')}`, free: 'limited', pro: true },
    { label: t('f_cloud_sync'), free: false, pro: true },
    { label: t('f_ext'), free: false, pro: true },
  ] as { label: string; free: boolean | 'limited'; pro: boolean }[]);

  const FAQ = $derived([
    { q: t('prem_q1'), a: t('prem_a1') },
    { q: t('prem_q2'), a: t('prem_a2') },
    { q: t('prem_q3'), a: t('prem_a3') },
  ]);
</script>

<div class="wrap premview">
  <div class="head">
    <button class="backbtn" type="button" onclick={onBack}>← {t('library_link')}</button>
    <span class="cap">{edition === 'hosted' ? 'PRO_' : 'CONTRIBUTE_'}</span>
  </div>

  {#if edition === 'hosted'}
    <div class="premhero fadeup">
      <div class="price">
        <span class="cur">€</span>
        <DotNumber value={4} grid={9} />
        <span class="per">/ {t('plans_mo')}</span>
      </div>
      <p class="psub">{t('prem_sub')}</p>
      <p class="pyr">{t('plans_yr')} · <b>{t('pro_love')}</b></p>
    </div>

    <div class="premtable">
      <div class="prow phead" style="--i:0">
        <span class="pl"></span>
        <span class="pc">{t('prem_free_k').toUpperCase()}</span>
        <span class="pc pro">PRO</span>
      </div>
      {#each ROWS as row, i (row.label)}
        <div class="prow" style="--i:{i + 1}">
          <span class="pl">{row.label}</span>
          <span class="pc">
            {#if row.free === true}<b class="yes">✓</b>
            {:else if row.free === 'limited'}<span class="lim">15</span>
            {:else}<span class="no">—</span>{/if}
          </span>
          <span class="pc pro">
            {#if row.pro}<b class="yes">✓</b>{:else}<span class="no">—</span>{/if}
          </span>
        </div>
      {/each}
    </div>

    <div class="premcta">
      <button class="btn" type="button" disabled>
        {t('plans_soon')} — {t('go_premium').toUpperCase()}
      </button>
      <span class="soonnote">{t('prem_soon_note')}</span>
      <a class="linklike" href={REPO} target="_blank" rel="noopener">{t('prem_star')} <b>→</b></a>
    </div>

    <div class="premfaq">
      {#each FAQ as item, i (item.q)}
        <div class="faq" style="--i:{i}">
          <div class="fq">{item.q}</div>
          <div class="fa">{item.a}</div>
        </div>
      {/each}
    </div>
  {:else}
    <div class="premhero fadeup">
      <p class="chead">{t('contrib_head')}</p>
      <p class="psub">{t('contrib_sub')}</p>
    </div>

    <div class="contribgrid">
      <a class="ccard" style="--i:0" href={REPO} target="_blank" rel="noopener">
        <span class="ci">★</span>
        <span class="cn">{t('contrib_star')}</span>
        <span class="ca">→</span>
      </a>
      <a class="ccard" style="--i:1" href="{REPO}/fork" target="_blank" rel="noopener">
        <span class="ci">⑂</span>
        <span class="cn">{t('contrib_fork')}</span>
        <span class="ca">→</span>
      </a>
      <a class="ccard" style="--i:2" href="{REPO}/pulls" target="_blank" rel="noopener">
        <span class="ci">↑</span>
        <span class="cn">{t('contrib_pr')}</span>
        <span class="ca">→</span>
      </a>
    </div>

    <div class="premcta">
      <a
        class="linklike"
        href="{REPO}/blob/master/docs/SELF-HOSTING.md"
        target="_blank"
        rel="noopener"
      >{t('selfhost_docs')} <b>→</b></a>
    </div>

    <div class="premfaq">
      <div class="faq" style="--i:0">
        <div class="fq">{t('prem_q1')}</div>
        <div class="fa">{t('prem_a1')}</div>
      </div>
      <div class="faq" style="--i:1">
        <div class="fq">{t('prem_q2')}</div>
        <div class="fa">{t('prem_a2')}</div>
      </div>
    </div>
  {/if}
</div>
