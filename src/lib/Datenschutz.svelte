<script lang="ts">
  // Datenschutzerklärung (Art. 13 DSGVO) for the hosted instance at myflick.app,
  // ported from the landing site (landing/src/pages/datenschutz.astro).
  // Grounded in the umbrella's legal review and in what the deployed code
  // actually does — no claims the software doesn't honor.
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
    <h1>Datenschutzerklärung</h1>
    <p class="updated">Stand: 19. Juli 2026</p>

    <p class="quiet">
      This privacy policy covers the hosted service at myflick.app and is
      provided in German, the operator's jurisdiction. An English working
      version is maintained in the open at
      <a href="{REPO}/blob/master/docs/legal/PRIVACY.md" target="_blank" rel="noopener">github.com/one-more-refactor/flick</a>.
      Self-hosted instances are the responsibility of their operators.
    </p>

    <h2>1. Verantwortlicher</h2>
    <p>
      Verantwortlicher für die Datenverarbeitung auf der gehosteten Instanz
      <strong>myflick.app</strong> (einschließlich app.myflick.app und
      admin.myflick.app) ist:
    </p>
    <p>
      <span class="fill">[Vorname Nachname]</span><br />
      <span class="fill">[Straße Hausnummer]</span><br />
      <span class="fill">[PLZ Ort]</span>, Deutschland<br />
      E-Mail: <span class="fill">[kontakt@myflick.app]</span>
    </p>
    <p>
      Ein Datenschutzbeauftragter ist nicht benannt, da keine gesetzliche
      Pflicht dazu besteht. Sie erreichen uns in allen Datenschutzfragen unter
      der oben genannten E-Mail-Adresse.
    </p>

    <h2>2. Das Wichtigste in Kürze</h2>
    <ul>
      <li><strong>Keine Werbung, keine Analyse-/Tracking-Dienste, keine Tracking-Cookies, keine Weitergabe zu Marketingzwecken.</strong></li>
      <li>Die App lädt <strong>keine externen Schriftarten, CDNs oder Tracker</strong> — die Oberfläche ist vollständig selbst ausgeliefert.</li>
      <li>Sie können flick als <strong>Gast ohne Konto</strong> nutzen.</li>
      <li>Die Server stehen in <strong>Frankfurt am Main, Deutschland</strong>.</li>
      <li>flick ist quelloffen (AGPL-3.0) und <strong>selbst hostbar</strong> — wer möchte, betreibt eine eigene Instanz, deren Daten unsere Server nie erreichen.</li>
      <li>Export und Löschung Ihres Kontos sind <strong>direkt in der App</strong> möglich.</li>
    </ul>

    <h2>3. Welche Daten wir verarbeiten, wozu, und auf welcher Rechtsgrundlage</h2>

    <h3>3.1 Konto und Profil</h3>
    <ul>
      <li><strong>E-Mail-Adresse</strong> — zur Kontoerstellung, Anmeldung und für Login-Codes. <em>Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertrag).</em></li>
      <li><strong>Passwort</strong> — ausschließlich als starker Einweg-Hash (argon2id) gespeichert; Ihr Klartext-Passwort sehen und speichern wir nie. <em>Art. 6 Abs. 1 lit. b; Sicherheit: Art. 32 DSGVO.</em></li>
      <li><strong>Anzeigename, optionaler Benutzername, optionales Profilbild</strong> — das Profilbild laden Sie freiwillig hoch und können es jederzeit entfernen. <em>Art. 6 Abs. 1 lit. b bzw. lit. a (Einwilligung).</em></li>
      <li><strong>Einstellungen</strong> — Lesegeschwindigkeit, Theme, Sprache, Onboarding-Stand. <em>Art. 6 Abs. 1 lit. b.</em></li>
    </ul>

    <h3>3.2 Ihre Leseinhalte</h3>
    <ul>
      <li><strong>Dokumente und Bücher, die Sie hinzufügen</strong> (per Einfügen, Datei-Upload, URL-Import oder aus dem Katalog) — einschließlich Text, berechneter Lese-Timeline, Titel, Autor, Quell-URL und Tags. Gespeichert, um Reader, Volltextsuche und geräteübergreifende Synchronisierung bereitzustellen. <em>Art. 6 Abs. 1 lit. b.</em></li>
      <li><strong>Leseposition, Tages-Wortzahlen und Lesesitzungen</strong> (Beginn, Dauer, Wörter, Durchschnittstempo) — für Fortschritt, Statistiken und Streaks. <em>Art. 6 Abs. 1 lit. b und f.</em></li>
      <li>Für hochgeladene Inhalte sind Sie verantwortlich; bitte laden Sie keine fremden personenbezogenen Daten oder vertrauliches Material hoch, zu dessen Weitergabe Sie nicht berechtigt sind.</li>
    </ul>

    <h3>3.3 Freunde und Teilen (optional)</h3>
    <ul>
      <li>Verbinden Sie sich über einen persönlichen Link mit einem <strong>Freund</strong>, speichern wir diese Verbindung. Freunde sehen <strong>nur aggregierte Zahlen</strong> (Wörter, Streaks, Zeit) — nie Ihre Titel oder Inhalte.</li>
      <li>Erstellen Sie einen <strong>Teilen-Link</strong> für ein Buch, kann jeder mit diesem Link genau dieses Buch lesen (bzw. importieren, wenn Sie das erlauben), bis Sie den Link widerrufen.</li>
      <li><em>Art. 6 Abs. 1 lit. a/b — Sie stoßen diese Funktionen selbst an.</em></li>
    </ul>

    <h3>3.4 Login-Codes per E-Mail</h3>
    <p>
      Fordern Sie einen Login-Code an, speichern wir einen kurzlebigen Hash des
      Codes (ca. 10 Minuten gültig, einmal verwendbar) und senden den Code an
      Ihre E-Mail-Adresse. Versanddienstleister:
      <span class="fill">[wird ergänzt, sobald der E-Mail-Versand aktiv ist]</span>.
      <em>Art. 6 Abs. 1 lit. b.</em>
    </p>

    <h3>3.5 Anmeldung über Drittanbieter (sofern angeboten)</h3>
    <p>
      Melden Sie sich über einen Drittanbieter (z. B. Google oder GitHub) an,
      erhalten wir von diesem eine Konto-Kennung und Ihre verifizierte
      E-Mail-Adresse, um Ihr Konto anzulegen oder zuzuordnen. Die Nutzung ist
      Ihre freie Entscheidung; es gelten zusätzlich die Datenschutzhinweise des
      jeweiligen Anbieters. <em>Art. 6 Abs. 1 lit. b.</em>
    </p>

    <h3>3.6 Empfehlungsprogramm</h3>
    <p>
      Treten Sie über einen Empfehlungslink bei, speichern wir, wer Sie
      empfohlen hat, sowie — nur für empfohlene Registrierungen — einen
      <strong>gesalzenen Hash Ihrer IP-Adresse</strong> (pseudonymisiert), um
      Selbst-Empfehlungen und Missbrauch zu verhindern.
      <em>Art. 6 Abs. 1 lit. f (Betrugsprävention).</em>
    </p>

    <h3>3.7 Cookie und lokaler Speicher</h3>
    <ul>
      <li><strong>flick_session</strong> — ein technisch notwendiges <code>HttpOnly</code>/<code>Secure</code>/<code>SameSite=Lax</code>-Cookie, das Sie angemeldet hält (30 Tage). Es dient nicht dem Tracking. <em>§ 25 Abs. 2 Nr. 2 TDDDG — keine Einwilligung erforderlich.</em></li>
      <li><strong>Lokaler Speicher (localStorage)</strong> — enthält nur funktionale Einstellungen (Theme, Sprache, Tempo, Ausblenden des Hinweises unten) und bleibt auf Ihrem Gerät. Gesetzt wird er erst, wenn Sie die jeweilige Einstellung selbst ändern.</li>
    </ul>
    <p>
      Da wir ausschließlich technisch notwendige Speicherung und keinerlei
      Tracker einsetzen, ist <strong>keine Einwilligung erforderlich</strong> — es
      gibt nichts einzuwilligen und entsprechend keine Einwilligung, die Sie
      widerrufen müssten. Der kurze Hinweis am Seitenende ist deshalb bewusst
      <strong>nur eine Information</strong> und keine Cookie-Abfrage: er
      blockiert nichts, setzt nichts voraus und lässt sich schlicht schließen.
    </p>

    <h3>3.8 Server- und Sicherheitsprotokolle</h3>
    <p>
      Unsere Server führen kurzfristige technische Protokolle, die Ihre
      IP-Adresse, Zeitpunkt und Pfad einer Anfrage enthalten können — für
      Betrieb, Sicherheit und Missbrauchsabwehr (z. B. Rate-Limiting; dabei
      werden IP-Adressen pseudonymisiert verarbeitet). Diese Protokolle werden
      nach <strong>spätestens 14 Tagen</strong> gelöscht.
      <em>Art. 6 Abs. 1 lit. f.</em>
    </p>

    <h2>4. Empfänger und Auftragsverarbeiter</h2>
    <p>Wir verkaufen keine Daten. Wir setzen wenige Dienstleister ein:</p>
    <ul>
      <li><strong>Hosting:</strong> Oracle Cloud Infrastructure (Oracle), Rechenzentrum <strong>Frankfurt am Main, Deutschland</strong> — dort laufen Dienst und Datenbank.</li>
      <li><strong>Netzwerk / DDoS-Schutz:</strong> Cloudflare, Inc. (USA), leitet den Datenverkehr weiter und schützt ihn; dabei können IP-Adresse und Anfrage-Metadaten verarbeitet werden. Übermittlungen in die USA sind durch das <strong>EU-US Data Privacy Framework</strong> und/oder EU-Standardvertragsklauseln abgesichert.</li>
      <li><strong>Anmelde-Anbieter Ihrer Wahl</strong> (sofern angeboten und von Ihnen genutzt): Google LLC bzw. GitHub, Inc.</li>
    </ul>

    <h2>5. Speicherdauer</h2>
    <ul>
      <li><strong>Konto und Inhalte:</strong> solange Ihr Konto besteht. Löschen Sie Ihr Konto (in der App), werden Profil, Dokumente, Statistiken, Sitzungen, Freundschaften und Empfehlungsdaten gelöscht.</li>
      <li><strong>Papierkorb:</strong> gelöschte Bücher werden nach <strong>30 Tagen</strong> endgültig entfernt.</li>
      <li><strong>Login-Codes:</strong> verfallen nach ca. 10 Minuten bzw. mit Verwendung.</li>
      <li><strong>Anmelde-Sitzungen:</strong> laufen nach 30 Tagen ab.</li>
      <li><strong>Technische Protokolle:</strong> höchstens 14 Tage (Abschnitt 3.8).</li>
      <li><strong>Gastdaten:</strong> hängen an einer anonymen Gast-Sitzung; erstellen Sie ein Konto, wird Ihre Gast-Bibliothek in das Konto überführt.</li>
    </ul>

    <h2>6. Ihre Rechte</h2>
    <p>
      Sie haben nach der DSGVO das Recht auf <strong>Auskunft</strong> (Art. 15),
      <strong>Berichtigung</strong> (Art. 16), <strong>Löschung</strong>
      (Art. 17), <strong>Einschränkung</strong> (Art. 18),
      <strong>Datenübertragbarkeit</strong> (Art. 20) und
      <strong>Widerspruch</strong> (Art. 21) sowie das Recht, eine erteilte
      Einwilligung jederzeit zu widerrufen (Art. 7 Abs. 3).
    </p>
    <p>
      Direkt in der App können Sie Ihre Daten <strong>exportieren</strong> und
      Ihr <strong>Konto löschen</strong>; außerdem Profil und Einstellungen
      ändern, das Profilbild entfernen und Teilen-Links widerrufen. Für alle
      weiteren Anliegen genügt eine E-Mail an
      <span class="fill">[kontakt@myflick.app]</span> — wir antworten innerhalb
      eines Monats.
    </p>
    <p>
      Sie haben zudem das Recht auf <strong>Beschwerde bei einer
      Datenschutz-Aufsichtsbehörde</strong>, etwa der Behörde Ihres
      Aufenthaltsorts oder der für uns zuständigen Behörde:
      <span class="fill">[zuständige Landesdatenschutzbehörde]</span>.
    </p>

    <h2>7. Kinder und Jugendliche</h2>
    <p>
      Der gehostete Dienst richtet sich nicht an Kinder. Für die Nutzung müssen
      Sie mindestens <strong>16 Jahre</strong> alt sein oder über die
      Einwilligung eines Erziehungsberechtigten verfügen. Wird uns bekannt, dass
      ein Kind unter 16 Jahren uns ohne solche Einwilligung Daten übermittelt
      hat, löschen wir diese.
    </p>

    <h2>8. Sicherheit</h2>
    <p>
      Wir schützen Ihre Daten unter anderem durch argon2id-Passwort-Hashing,
      TLS-Transportverschlüsselung, <code>HttpOnly</code>/<code>Secure</code>-Cookies,
      Rate-Limiting auf Anmelde- und Import-Endpunkten, serverseitige
      Validierung inklusive SSRF-Schutz bei URL-Importen sowie
      Verifizierungspflicht für E-Mail-Adressen bei Drittanbieter-Anmeldung
      (technische und organisatorische Maßnahmen, Art. 32 DSGVO).
    </p>

    <h2>9. Keine automatisierten Einzelentscheidungen</h2>
    <p>
      Eine automatisierte Entscheidungsfindung oder ein Profiling mit
      rechtlicher Wirkung findet nicht statt.
    </p>

    <h2>10. Änderungen</h2>
    <p>
      Wir passen diese Erklärung an, wenn sich der Dienst weiterentwickelt. Es
      gilt die jeweils hier veröffentlichte Fassung; das Datum oben zeigt den
      Stand.
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
  .body h3 {
    font-size: 12px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--dim);
    margin: 22px 0 6px;
  }
  .body p,
  .body li { font-size: 13px; line-height: 1.7; color: var(--ink); }
  .body p { margin: 10px 0; }
  .body ul { margin: 10px 0; padding-left: 20px; }
  .body li { margin: 5px 0; }
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
