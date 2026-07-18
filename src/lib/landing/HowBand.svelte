<script lang="ts">
  // HOW band — the page's single inverse-video surface (CONTRACTS v0.3:
  // "[01] ONE WORD AT A TIME · [02] THE PIVOT LETTER · [03] YOUR PACE").
  // Every word shown here comes from the flick-core-generated demo timelines
  // (demos.ts) — pivots are engine truth, never recomputed in the client.
  // All classes are hb- prefixed: app.css has bare global rules (.stage,
  // .rail, …) that would otherwise leak in.
  import { AUTH_DEMO_WORDS } from '../demos';
  import { t } from '../i18n.svelte';

  // [01] a single settled frame of the reader
  const stage = AUTH_DEMO_WORDS[2]; // ['reading', 2]

  // [02] the ORP column: five successive demo words, printed as a strip and
  // optically aligned on their pivot letters (monospace makes this exact).
  const stack = AUTH_DEMO_WORDS.slice(4, 9); // seven hundred words per minute.
  const preW = Math.max(...stack.map(([w, p]) => p));
  const postW = Math.max(...stack.map(([w, p]) => w.length - p - 1));
</script>

<section class="lp-how" data-lp-band>
  <div class="hb-wrap">
    <h2 class="hb-lead" data-lp-reveal>{t('lp_how_lead')}</h2>
    <div class="hb-grid">
      <article class="hb-cell" data-lp-reveal>
        <p class="hb-ix">[01]</p>
        <h3 class="hb-ct">{t('lp_how1_t')}</h3>
        <div class="hb-viz hb-stage" aria-hidden="true">
          <span class="hb-rail"><i></i></span>
          <span class="hb-w"
            >{stage[0].slice(0, stage[1])}<span class="hb-pv">{stage[0].charAt(stage[1])}</span
            >{stage[0].slice(stage[1] + 1)}</span
          >
          <span class="hb-rail"><i></i></span>
        </div>
        <p class="hb-cd">{t('lp_how1_d')}</p>
      </article>

      <article class="hb-cell" data-lp-reveal>
        <p class="hb-ix">[02]</p>
        <h3 class="hb-ct">{t('lp_how2_t')}</h3>
        <div class="hb-viz hb-stack" aria-hidden="true" style="--prew: {preW}; --postw: {postW}">
          <span class="hb-spine"></span>
          {#each stack as [w, p], i (i)}
            <span class="hb-row" data-lp-row
              ><span class="hb-pre">{w.slice(0, p)}</span><span class="hb-pv">{w.charAt(p)}</span
              ><span class="hb-post">{w.slice(p + 1)}</span></span
            >
          {/each}
        </div>
        <p class="hb-cd">{t('lp_how2_d')}</p>
      </article>

      <article class="hb-cell" data-lp-reveal>
        <p class="hb-ix">[03]</p>
        <h3 class="hb-ct">{t('lp_how3_t')}</h3>
        <div class="hb-viz hb-meter" aria-hidden="true">
          <span class="hb-ticks"><i>250</i><i>450</i><i>700</i></span>
          <span class="hb-track"><i class="hb-fill" data-lp-bar></i></span>
          <span class="hb-unit">wpm</span>
        </div>
        <p class="hb-cd">{t('lp_how3_d')}</p>
      </article>
    </div>
  </div>
</section>

<style>
  /* the ONE inverse-video band on the page: ink ground, bg type. Elevation by
     surface ladder, never shadow. Square. Hairlines only. */
  .lp-how {
    background: var(--ink);
    color: var(--bg);
    padding: clamp(56px, 9vh, 96px) 0;
    transition: background var(--t-flick) var(--ease), color var(--t-flick) var(--ease);
  }
  .hb-wrap {
    width: 100%;
    max-width: 880px;
    margin: 0 auto;
    padding: 0 28px;
  }
  .hb-lead {
    font-size: 11px;
    font-weight: 400;
    letter-spacing: 0.24em;
    text-transform: uppercase;
    color: var(--bg);
    text-align: center;
    margin: 0 0 clamp(30px, 5vh, 48px);
  }
  .hb-lead::before {
    content: '— ';
    color: var(--dim);
  }
  .hb-lead::after {
    content: ' —';
    color: var(--dim);
  }

  .hb-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: clamp(24px, 4vw, 44px);
  }
  @media (max-width: 680px) {
    .hb-grid {
      grid-template-columns: 1fr;
      gap: 40px;
    }
  }

  .hb-cell {
    text-align: center;
    margin: 0;
  }
  .hb-ix {
    font-size: 10px;
    letter-spacing: 0.3em;
    color: var(--dim);
    margin: 0 0 8px;
  }
  .hb-ct {
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    margin: 0 0 18px;
  }
  .hb-cd {
    font-size: 12px;
    line-height: 1.75;
    color: var(--bg);
    margin: 18px auto 0;
    max-width: 34ch;
  }

  /* shared visual plate: fixed height so the three instruments sit level */
  .hb-viz {
    height: 108px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    letter-spacing: 0;
    user-select: none;
  }
  .hb-pv {
    color: var(--accent);
  }
  /* noir: accent == ink == this band's ground — mirror the app's inverse-video
     pivot treatment (bg block, ink letter) so the anchor stays visible */
  :global([data-theme='noir']) .hb-pv {
    background: var(--bg);
    color: var(--ink);
    padding: 0 0.04em;
  }

  /* [01] one settled reader frame: rails + word */
  .hb-stage {
    gap: 12px;
  }
  .hb-stage .hb-w {
    font-size: 19px;
  }
  .hb-rail {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 132px;
  }
  .hb-rail::before,
  .hb-rail::after {
    content: '';
    flex: 1;
    border-top: 1px solid var(--dim);
  }
  .hb-rail i {
    width: 1px;
    height: 9px;
    background: var(--accent);
    flex: none;
  }
  :global([data-theme='noir']) .hb-rail i {
    background: var(--bg);
  }

  /* [02] the ORP column — pivot letters aligned on one vertical hairline */
  .hb-stack {
    position: relative;
    gap: 6px;
    font-size: 16px;
  }
  .hb-spine {
    position: absolute;
    top: 2px;
    bottom: 2px;
    left: calc(50% + (var(--prew) - var(--postw)) * 0.5ch);
    width: 1px;
    background: var(--dim);
  }
  .hb-row {
    position: relative;
    display: grid;
    grid-template-columns: calc(var(--prew) * 1ch) 1ch calc(var(--postw) * 1ch);
    line-height: 1.15;
  }
  .hb-pre {
    text-align: right;
    color: var(--dim);
  }
  .hb-post {
    text-align: left;
    color: var(--dim);
  }

  /* [03] the pace meter: ticks + a 2px accent bar that sweeps once */
  .hb-meter {
    gap: 10px;
    width: min(220px, 100%);
    margin: 0 auto;
  }
  .hb-ticks {
    display: flex;
    justify-content: space-between;
    width: 100%;
    font-size: 10px;
    font-weight: 400;
    letter-spacing: 0.08em;
    color: var(--dim);
  }
  .hb-track {
    display: block;
    width: 100%;
    height: 2px;
    background: var(--dim);
  }
  .hb-fill {
    display: block;
    height: 100%;
    width: 100%;
    background: var(--accent);
  }
  :global([data-theme='noir']) .hb-fill {
    background: var(--bg);
  }
  .hb-unit {
    font-size: 9px;
    font-weight: 400;
    letter-spacing: 0.3em;
    text-transform: uppercase;
    color: var(--dim);
  }
</style>
