<script lang="ts">
  // A full-bleed conveyor of everything flick ingests — the content IS the
  // feature list (ported from the retired marketing site). Pure CSS marquee:
  // two identical halves, translateX(-50%), frozen under
  // prefers-reduced-motion.
  import { t } from '../i18n.svelte';

  const formats = $derived([
    t('lp_fmt_paste'),
    'PDF',
    'EPUB',
    'TXT',
    'Markdown',
    t('lp_fmt_web'),
    t('lp_fmt_kindle'),
    t('lp_fmt_cloud'),
  ]);
</script>

<div class="strip" aria-label={formats.join(', ')}>
  <div class="track">
    <div class="half">
      {#each formats as f (f)}<span class="item">{f}</span>{/each}
    </div>
    <div class="half" aria-hidden="true">
      {#each formats as f (f)}<span class="item">{f}</span>{/each}
    </div>
  </div>
</div>

<style>
  .strip {
    border-top: 1px solid var(--line);
    border-bottom: 1px solid var(--line);
    padding: 14px 0;
    overflow: hidden;
  }
  .track {
    display: flex;
    width: max-content;
    animation: strip-scroll 30s linear infinite;
  }
  .half {
    display: flex;
    flex: none;
  }
  .item {
    font-size: 12px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--dim);
    white-space: nowrap;
    padding-right: 1.4em;
  }
  .item::after {
    content: '·';
    color: var(--accent);
    padding-left: 1.4em;
  }
  @keyframes strip-scroll {
    to {
      transform: translateX(-50%);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .track {
      animation: none;
    }
  }
</style>
