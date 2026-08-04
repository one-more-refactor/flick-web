<script lang="ts">
  // The self-host door, at full size (ported from the retired marketing site).
  // Under the current positioning the person who wants to run flick themselves
  // is a primary visitor, not a footnote — so they get a band, the real
  // install line, and four facts they can check.
  import { t } from '../i18n.svelte';
  import { REPO } from '../consts';

  const CMD = 'curl -fsSL https://myflick.app/install.sh | sh';
  let copied = $state(false);
  function copy() {
    navigator.clipboard?.writeText(CMD).then(() => {
      copied = true;
      setTimeout(() => (copied = false), 1600);
    });
  }
</script>

<section class="lp-sh" id="selfhost" data-lp-band>
  <div class="sh-wrap">
    <p class="sh-label" data-lp-reveal>{t('lp_sh_label')}</p>
    <h2 class="sh-h2" data-lp-reveal>{t('lp_sh_h')}</h2>
    <p class="sh-lede" data-lp-reveal>{t('lp_sh_lede')}</p>

    <button class="sh-cmd" type="button" onclick={copy} data-lp-reveal title={t('lp_sh_copy')}>
      <code>{CMD}</code>
      <span class="sh-copy">{copied ? t('lp_sh_copied') : t('lp_sh_copy')}</span>
    </button>
    <p class="sh-note" data-lp-reveal>{t('lp_sh_cmd_note')}</p>

    <div class="sh-facts">
      <div class="sh-fact" data-lp-reveal><b>AGPL-3.0</b><span>{t('lp_sh_f1')}</span></div>
      <div class="sh-fact" data-lp-reveal><b>0</b><span>{t('lp_sh_f2')}</span></div>
      <div class="sh-fact" data-lp-reveal><b>OIDC</b><span>{t('lp_sh_f3')}</span></div>
      <div class="sh-fact" data-lp-reveal><b>TUI</b><span>{t('lp_sh_f4')}</span></div>
    </div>

    <p class="sh-pile" data-lp-reveal>{t('lp_sh_pile')}</p>

    <div class="sh-row" data-lp-reveal>
      <a class="sh-doc" href="{REPO}#self-host-quickstart" target="_blank" rel="noopener">
        {t('lp_sh_docs')} →
      </a>
      <a class="sh-doc ghost" href={REPO} target="_blank" rel="noopener">github ↗</a>
    </div>
  </div>
</section>

<style>
  .lp-sh {
    padding: 96px 0;
    border-top: 1px solid var(--line);
  }
  .sh-wrap {
    width: 100%;
    max-width: 880px;
    margin: 0 auto;
    padding: 0 28px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 18px;
  }
  .sh-label {
    margin: 0;
    font-size: 11px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--dim);
  }
  .sh-h2 {
    margin: 0;
    font-size: clamp(24px, 4.4vw, 34px);
    line-height: 1.15;
    letter-spacing: -0.01em;
  }
  .sh-lede {
    margin: 0;
    max-width: 64ch;
    color: var(--dim);
    line-height: 1.6;
  }
  .sh-cmd {
    display: flex;
    align-items: center;
    gap: 14px;
    width: 100%;
    max-width: 640px;
    margin-top: 6px;
    padding: 12px 16px;
    background: var(--panel);
    border: 1px solid var(--line);
    color: var(--ink);
    font: inherit;
    text-align: left;
    cursor: pointer;
    overflow-x: auto;
  }
  .sh-cmd code {
    flex: 1;
    white-space: nowrap;
    font-size: 13px;
  }
  .sh-copy {
    font-size: 10px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--dim);
    flex: none;
  }
  .sh-cmd:hover .sh-copy {
    color: var(--accent);
  }
  .sh-note {
    margin: 0;
    font-size: 12.5px;
    color: var(--dim);
    max-width: 60ch;
  }
  .sh-facts {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 1px;
    width: 100%;
    margin-top: 14px;
    background: var(--line);
    border: 1px solid var(--line);
  }
  .sh-fact {
    background: var(--bg);
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .sh-fact b {
    font-size: 15px;
    letter-spacing: 0.02em;
  }
  .sh-fact span {
    font-size: 12px;
    line-height: 1.5;
    color: var(--dim);
  }
  .sh-pile {
    margin: 8px 0 0;
    font-size: 13px;
    color: var(--dim);
    max-width: 62ch;
    line-height: 1.6;
  }
  .sh-row {
    display: flex;
    gap: 18px;
    margin-top: 4px;
  }
  .sh-doc {
    font-size: 13px;
    color: var(--ink);
    text-decoration: none;
    border-bottom: 1px solid var(--accent);
    padding-bottom: 1px;
  }
  .sh-doc.ghost {
    color: var(--dim);
    border-bottom-color: var(--line);
  }
  .sh-doc:hover {
    color: var(--accent);
  }
</style>
