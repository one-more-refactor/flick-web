<script lang="ts">
  // NUMBERS band — dot-matrix stats (design brief: "Numbers band = dot-matrix
  // stats"). Honest figures only: the average reader, this page's own demo,
  // what the eye does, and how few keys the reader needs.
  import StatDots from './StatDots.svelte';
  import { t } from '../i18n.svelte';
</script>

<section class="lp-num" data-lp-band>
  <div class="nb-wrap">
    <h2 class="nb-lead">{t('lp_num_lead')}</h2>
    <div class="nb-grid">
      <div data-lp-reveal>
        <StatDots value={250} unit="wpm" label={t('lp_num_avg')} delay={0} />
      </div>
      <div data-lp-reveal>
        <StatDots value={700} unit="wpm" label={t('lp_num_demo')} delay={60} />
      </div>
      <div data-lp-reveal>
        <StatDots value={0} unit="saccades" label={t('lp_num_saccades')} delay={120} />
      </div>
      <div data-lp-reveal>
        <StatDots value={3} unit="keys" delay={180}>
          <span class="nb-keys"><kbd>←</kbd><kbd>space</kbd><kbd>→</kbd></span>
        </StatDots>
      </div>
    </div>
  </div>
</section>

<style>
  .lp-num {
    padding: clamp(56px, 9vh, 96px) 0;
  }
  .nb-wrap {
    width: 100%;
    max-width: 880px;
    margin: 0 auto;
    padding: 0 28px;
  }
  .nb-lead {
    font-size: 11px;
    font-weight: 400;
    letter-spacing: 0.24em;
    text-transform: uppercase;
    color: var(--dim);
    text-align: center;
    margin: 0 0 clamp(30px, 5vh, 48px);
  }
  .nb-lead::before {
    content: '— ';
    color: var(--accent);
  }
  .nb-lead::after {
    content: ' —';
    color: var(--accent);
  }

  .nb-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 28px;
    align-items: start;
  }
  @media (max-width: 680px) {
    .nb-grid {
      grid-template-columns: repeat(2, 1fr);
      gap: 40px 20px;
    }
  }

  /* keycap primitive (design tokens): hairline border, 2px bottom, tracked */
  .nb-keys {
    display: inline-flex;
    gap: 6px;
    align-items: baseline;
  }
  kbd {
    font-family: inherit;
    font-size: 10px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--dim);
    border: 1px solid var(--line);
    border-bottom-width: 2px;
    padding: 1px 6px;
  }
</style>
