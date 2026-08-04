<script lang="ts">
  // Was the Impressum (§ 5 DDG), ported from the landing site
  // (landing/src/pages/impressum.astro). Taken down by the operator's decision
  // while myflick.app runs as a non-commercial public instance with no
  // payments; restoring the Anbieterkennzeichnung is a single edit when Pro
  // starts taking money.
  import { REPO } from './consts';

  // Legal pages have no app CTA; onStart stays in the type for the uniform
  // page contract but is intentionally not destructured.
  let { onBack }: { onBack: () => void; onStart?: () => void } = $props();
</script>

<div class="wrap doc">
  <div class="head-row">
    <button class="backbtn" type="button" onclick={onBack}>← flick</button>
  </div>

  <article class="body">
    <h1>Über diese Instanz</h1>
    <p class="updated">Stand: 29. Juli 2026</p>

    <p class="quiet">
      About this instance — myflick.app is a public, non-commercial instance of
      flick. English summary below the German text.
    </p>

    <h2>Nicht-kommerzieller Betrieb</h2>
    <p>
      <strong>myflick.app</strong> (einschließlich <strong>app.myflick.app</strong>)
      ist derzeit eine öffentlich zugängliche, <strong>nicht-kommerzielle</strong>
      Instanz der freien Software flick. Es werden <strong>keine Zahlungen
      entgegengenommen</strong>, keine Leistungen gegen Entgelt angeboten und keine
      Werbung geschaltet. Der Betrieb erfolgt als privates Projekt.
    </p>
    <p>
      Sobald hier ein kostenpflichtiges Angebot startet, wird an dieser Stelle
      eine vollständige Anbieterkennzeichnung gemäß § 5 DDG veröffentlicht.
    </p>

    <h2>Kontakt</h2>
    <p>
      Fragen, Hinweise auf Rechtsverletzungen oder Anliegen zum Datenschutz:
      <span class="fill">[kontakt@myflick.app]</span>. Anfragen werden zeitnah
      beantwortet.
    </p>

    <h2>Die Software</h2>
    <p>
      flick ist freie Software unter der <strong>AGPL-3.0</strong>. Der vollständige
      Quelltext dieser Instanz ist öffentlich einsehbar unter
      <a href={REPO} target="_blank" rel="noopener">github.com/one-more-refactor/flick</a>.
      Von Dritten selbst gehostete Instanzen werden von deren Betreibern in
      eigener Verantwortung betrieben; diese Seite gilt ausschließlich für die
      hier erreichbare Instanz.
    </p>

    <h2>Datenschutz</h2>
    <p>
      Wie mit Ihren Daten umgegangen wird, steht in der
      <a href="/datenschutz/">Datenschutzerklärung</a> — kurz: keine Werbung,
      keine Tracker, keine Analysedienste, Export und Löschung jederzeit möglich.
    </p>

    <h2>Haftung für Links</h2>
    <p>
      Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte
      wir keinen Einfluss haben. Für diese fremden Inhalte ist stets der
      jeweilige Anbieter verantwortlich. Zum Zeitpunkt der Verlinkung waren
      keine Rechtsverstöße erkennbar; bei Bekanntwerden von Rechtsverletzungen
      entfernen wir derartige Links umgehend.
    </p>

    <h2>In English</h2>
    <p>
      myflick.app is a public, non-commercial instance of flick, run as a
      personal project. No payments are taken, nothing is sold and no advertising
      is served. flick itself is free software under the AGPL-3.0 — the complete
      source of this instance is on
      <a href={REPO} target="_blank" rel="noopener">GitHub</a>. Instances
      hosted by other people are operated, and answered for, by whoever runs them.
      A full German provider identification (Impressum) will be published here
      before any paid offering starts.
    </p>
  </article>
</div>

<style>
  /* the LegalDoc frame from the landing site, folded into the component:
     narrow document column, hairline-ruled section heads, one accent */
  .doc { padding-top: 32px; padding-bottom: 72px; }
  .head-row { margin-bottom: 40px; }

  .body { max-width: 74ch; }
  .body h1 {
    font-size: 22px;
    letter-spacing: 0.06em;
    margin: 0 0 6px;
  }
  .updated { font-size: 11px; color: var(--dim); letter-spacing: 0.08em; margin: 0 0 34px; }

  .body h2 {
    font-size: 13px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    margin: 40px 0 10px;
    padding-top: 18px;
    border-top: 1px solid var(--line);
  }
  .body p { font-size: 13px; line-height: 1.7; color: var(--ink); margin: 10px 0; }
  .body a { color: var(--accent); text-decoration: underline; text-underline-offset: 2px; }
  .body strong { font-weight: 700; }
  .quiet { color: var(--dim); font-size: 12px; }

  /* operator details still to be filled in by the operator — visually loud on
     purpose so a placeholder can never quietly pass as a real document */
  .fill {
    background: none;
    color: var(--accent);
    border: 1px dashed var(--accent);
    padding: 0 4px;
    white-space: nowrap;
  }
</style>
