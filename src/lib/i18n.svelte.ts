// Tiny i18n (CONTRACTS.md: settings.lang auto/en/de). `auto` follows the
// browser. Brand language (FLICK_, theme names, "read it in a flick") is
// never translated — it IS the brand.

import type { Lang } from './api';
import { queueSettings } from './settings';
import { ES } from './i18n.es';

const LANG_KEY = 'flick.lang';

type Dict = Record<string, { en: string; de: string }>;

const DICT: Dict = {
  // header / shell
  login: { en: 'Log in', de: 'Anmelden' },
  logout: { en: 'Log out', de: 'Abmelden' },
  theme: { en: 'Theme', de: 'Theme' },
  language: { en: 'Language', de: 'Sprache' },
  guest: { en: 'guest', de: 'Gast' },
  save_account: { en: 'save your reading — create an account', de: 'Fortschritt sichern — Konto erstellen' },
  create_account: { en: 'Create account', de: 'Konto erstellen' },
  go_premium: { en: 'Go Premium', de: 'Premium holen' },
  auth_pitch: {
    en: 'one account — your library, position and streak on every device.',
    de: 'ein Konto — Bibliothek, Position und Serie auf jedem Gerät.',
  },
  auth_guest_merge: {
    en: 'your current reading comes with you.',
    de: 'dein bisheriges Lesen kommt mit.',
  },
  guest_hint: {
    en: 'guest session — your reading lives only in this browser',
    de: 'Gast-Sitzung — dein Lesefortschritt lebt nur in diesem Browser',
  },
  guest_keep: { en: 'keep it', de: 'sichern' },
  recent_k: { en: 'recent', de: 'zuletzt' },
  all_books_k: { en: 'all books', de: 'alle Bücher' },
  time_read_k: { en: 'time read', de: 'Lesezeit' },
  books_done_k: { en: 'books finished', de: 'Bücher beendet' },
  active_days_k: { en: 'active days', de: 'aktive Tage' },
  best_day_k: { en: 'best day', de: 'bester Tag' },
  start_here: { en: 'start here', de: 'starte hier' },
  new_k: { en: 'new', de: 'neu' },
  // add wizard (v0.4.3)
  wiz_source_q: { en: 'Where from?', de: 'Woher?' },
  src_paste: { en: 'Paste text', de: 'Text einfügen' },
  src_paste_d: { en: 'drop in any text', de: 'beliebigen Text einfügen' },
  src_file: { en: 'File', de: 'Datei' },
  src_file_d: { en: 'PDF · EPUB · TXT · MD', de: 'PDF · EPUB · TXT · MD' },
  src_url: { en: 'Web link', de: 'Web-Link' },
  src_url_d: { en: 'article or page URL', de: 'Artikel- oder Seiten-URL' },
  src_cloud: { en: 'Cloud storage', de: 'Cloud-Speicher' },
  src_cloud_d: { en: 'Dropbox · Drive · OneDrive', de: 'Dropbox · Drive · OneDrive' },
  src_catalog: { en: 'Catalog', de: 'Katalog' },
  src_catalog_d: { en: 'free classics, one tap', de: 'freie Klassiker, ein Tipp' },
  wiz_cloud_hint: {
    en: 'paste a public share link — the file is fetched directly',
    de: 'öffentlichen Freigabe-Link einfügen — die Datei wird direkt geladen',
  },
  wiz_cloud_bad: {
    en: 'that does not look like a Dropbox / Drive / OneDrive share link',
    de: 'das sieht nicht nach einem Dropbox-/Drive-/OneDrive-Link aus',
  },
  tags_label: { en: 'Tags (optional, comma-separated)', de: 'Tags (optional, Komma-getrennt)' },
  wiz_go: { en: 'Add & read', de: 'Hinzufügen & lesen' },
  // trash bin (v0.4.3)
  trash_k: { en: 'trash', de: 'Papierkorb' },
  trash_note: {
    en: 'kept for 30 days, then gone for good',
    de: '30 Tage aufbewahrt, dann endgültig weg',
  },
  restore: { en: 'restore', de: 'wiederherstellen' },
  purge_now: { en: 'delete now', de: 'jetzt löschen' },
  days_left: { en: 'days left', de: 'Tage übrig' },
  tag_all: { en: 'all', de: 'alle' },
  edit_tags: { en: 'edit tags', de: 'Tags bearbeiten' },
  // premium page (v0.5.1)
  prem_sub: {
    en: '€4/month keeps the lights on — and the free tier free.',
    de: '4 €/Monat hält die Lichter an — und den Gratis-Tarif gratis.',
  },
  prem_free_k: { en: 'free', de: 'gratis' },
  f_reader: {
    en: 'the full reader — engine, all themes, stats, streaks, sync',
    de: 'der volle Reader — Engine, alle Themes, Statistik, Serien, Sync',
  },
  f_imports: {
    en: 'every import: paste · PDF · EPUB · TXT · URL · clippings · cloud links',
    de: 'jeder Import: Einfügen · PDF · EPUB · TXT · URL · Clippings · Cloud-Links',
  },
  f_storage: { en: 'uncapped storage — nothing ever locked', de: 'unbegrenzter Speicher — nie gesperrt' },
  f_uploads_free: { en: '15 uploads per week', de: '15 Uploads pro Woche' },
  f_uploads_pro: { en: 'unlimited uploads', de: 'unbegrenzte Uploads' },
  f_cloud_sync: {
    en: 'cloud account sync (Dropbox · Drive), when it lands',
    de: 'Cloud-Konto-Sync (Dropbox · Drive), sobald verfügbar',
  },
  f_ext: {
    en: 'browser-extension auto-capture, when it lands',
    de: 'Browser-Extension Auto-Capture, sobald verfügbar',
  },
  prem_q1: { en: "what's free stays free?", de: 'was gratis ist, bleibt gratis?' },
  prem_a1: {
    en: 'Binding. Features never move from free to Pro, and existing content is never locked or deleted.',
    de: 'Verbindlich. Features wandern nie von Gratis zu Pro, und vorhandene Inhalte werden nie gesperrt oder gelöscht.',
  },
  prem_q2: { en: 'why is there no lifetime deal?', de: 'warum gibt es keinen Lifetime-Deal?' },
  prem_a2: {
    en: 'A one-time price on a product with ongoing storage costs is dishonest pyramid economics. We would rather stay small and solvent.',
    de: 'Ein Einmalpreis für ein Produkt mit laufenden Speicherkosten ist unehrliche Pyramiden-Ökonomie. Lieber klein und solvent.',
  },
  prem_q3: { en: 'where does the money go?', de: 'wohin geht das Geld?' },
  prem_a3: {
    en: 'Hosting and development of the open project. flick is AGPL — the hosted service funds the code everyone gets.',
    de: 'Hosting und Entwicklung des offenen Projekts. flick ist AGPL — der Hosted-Dienst finanziert den Code für alle.',
  },
  prem_soon_note: {
    en: 'payments land soon — until then, everything here is free',
    de: 'Bezahlung kommt bald — bis dahin ist hier alles gratis',
  },
  prem_star: { en: 'star the repo meanwhile', de: 'bis dahin: Stern auf GitHub' },
  contrib_head: {
    en: 'you self-host — everything is already yours.',
    de: 'du hostest selbst — alles gehört schon dir.',
  },
  contrib_sub: {
    en: 'No plans, no limits, no strings on your own server. If flick earns a place in your day, contribute instead:',
    de: 'Keine Tarife, keine Limits auf deinem eigenen Server. Wenn flick einen Platz in deinem Tag verdient, trag stattdessen bei:',
  },
  contrib_star: { en: 'star it', de: 'Stern geben' },
  contrib_fork: { en: 'fork it', de: 'forken' },
  contrib_pr: { en: 'open a PR', de: 'PR öffnen' },
  selfhost_docs: { en: 'self-hosting guide', de: 'Self-Hosting-Anleitung' },
  // streak chip (v0.5.1)
  chip_risk: { en: 'read today to keep your streak', de: 'lies heute, um deine Serie zu halten' },
  chip_done: { en: 'goal reached — streak safe', de: 'Ziel erreicht — Serie sicher' },
  goal_today: { en: 'today', de: 'heute' },
  // v0.6: selection, share, reader
  select_k: { en: 'select', de: 'auswählen' },
  selected_k: { en: 'selected', de: 'ausgewählt' },
  to_trash_k: { en: 'to trash', de: 'in den Papierkorb' },
  add_tags_k: { en: 'add tags', de: 'Tags hinzufügen' },
  cancel_k: { en: 'cancel', de: 'abbrechen' },
  share_k: { en: 'share', de: 'teilen' },
  link_copied: { en: 'link copied', de: 'Link kopiert' },
  shared_intro: { en: 'shared with you via flick', de: 'mit dir geteilt über flick' },
  shared_gone: {
    en: 'this share link is gone — expired or revoked',
    de: 'dieser Teilen-Link ist weg — abgelaufen oder zurückgezogen',
  },
  shared_note: {
    en: 'one tap: the book lands in your own library and starts playing. No account needed.',
    de: 'ein Tipp: das Buch landet in deiner eigenen Bibliothek und läuft los. Kein Konto nötig.',
  },
  zen_k: { en: 'zen', de: 'zen' },
  guides_k: { en: 'guides', de: 'Linien' },
  font_k: { en: 'size', de: 'Größe' },
  f_clients: {
    en: 'all clients — web, phone, browser extension',
    de: 'alle Clients — Web, Handy, Browser-Extension',
  },
  f_bulk: { en: 'bulk import — up to 50 files at once', de: 'Massenimport — bis zu 50 Dateien auf einmal' },
  f_share: {
    en: 'share links — friends read & import instantly',
    de: 'Teilen-Links — Freunde lesen & importieren sofort',
  },
  f_history: { en: 'reading history', de: 'Leseverlauf' },
  f_insights: {
    en: 'deep reading insights (server-computed), when they land',
    de: 'tiefe Lese-Insights (serverseitig), sobald verfügbar',
  },
  f_support: { en: 'you keep an indie project alive', de: 'du hältst ein Indie-Projekt am Leben' },
  // v0.7: referrals, events, social
  inv_head: { en: 'get a friend pro.', de: 'hol dir einen Freund Pro.' },
  inv_sub: {
    en: 'invite someone — when they join and actually read (300 words on 3 days), you BOTH get 30 days of Pro.',
    de: 'lade jemanden ein — wenn die Person beitritt und wirklich liest (300 Wörter an 3 Tagen), bekommt ihr BEIDE 30 Tage Pro.',
  },
  inv_copy: { en: 'copy invite link', de: 'Einladungslink kopieren' },
  inv_none: {
    en: 'no invite event running right now — links still work, rewards unlock with the next event',
    de: 'gerade kein Einladungs-Event — Links funktionieren trotzdem, Belohnungen kommen mit dem nächsten Event',
  },
  inv_ends: { en: 'event ends in', de: 'Event endet in' },
  inv_qualified: { en: 'qualified', de: 'qualifiziert' },
  inv_pending: { en: 'pending', de: 'ausstehend' },
  inv_days: { en: 'days', de: 'Tagen' },
  ev_invite: { en: 'invite → 30d pro', de: 'einladen → 30 T. Pro' },
  wr_title: { en: 'your year in words', de: 'dein Jahr in Wörtern' },
  wr_month: { en: 'top month', de: 'Top-Monat' },
  wr_weekday: { en: 'top weekday', de: 'Top-Wochentag' },
  wr_none: {
    en: 'nothing on record for this year yet — go read something',
    de: 'für dieses Jahr ist noch nichts notiert — lies was',
  },
  fr_k: { en: 'friends', de: 'Freunde' },
  fr_add_ph: { en: 'paste a friend link or code', de: 'Freundes-Link oder Code einfügen' },
  fr_add: { en: 'add', de: 'hinzufügen' },
  fr_link: { en: 'your friend link', de: 'dein Freundes-Link' },
  fr_week: { en: 'this week', de: 'diese Woche' },
  fr_none: { en: 'no friends yet — trade links', de: 'noch keine Freunde — tauscht Links' },
  fr_privacy: {
    en: 'friends only ever see numbers — words, streaks, time. Never titles.',
    de: 'Freunde sehen immer nur Zahlen — Wörter, Serien, Zeit. Nie Titel.',
  },
  unfriend: { en: 'unfriend', de: 'entfernen' },

  // landing
  start_reading: { en: 'Start reading', de: 'Loslesen' },
  already_here: { en: 'already here?', de: 'schon dabei?' },
  log_in_low: { en: 'log in', de: 'anmelden' },
  pick_one_up: { en: 'or pick one up', de: 'oder greif eins auf' },
  min: { en: 'min', de: 'Min' },

  // landing quick-read
  quick_read: { en: 'or drop your own file — start reading it now', de: 'oder leg deine eigene Datei ab — lies sofort los' },

  // plans / contribute
  plans_promise: { en: "what's free stays free", de: 'was gratis ist, bleibt gratis' },
  pro_love: { en: 'supports an indie open-source project', de: 'unterstützt ein Indie-Open-Source-Projekt' },
  contribute_note: { en: 'self-hosted — everything free, forever', de: 'selbst gehostet — alles gratis, für immer' },
  contribute_cta: { en: 'star · fork · PR', de: 'Stern · Fork · PR' },
  uploads_left: { en: 'uploads left this week', de: 'Uploads übrig diese Woche' },
  upload_limit_hit: { en: 'weekly upload limit reached — resets Monday', de: 'Wochen-Upload-Limit erreicht — Reset am Montag' },
  plans_soon: { en: 'SOON', de: 'BALD' },
  plans_free_feats: { en: 'all clients · every import · share links · 15 uploads/week', de: 'alle Clients · alle Importe · Teilen-Links · 15 Uploads/Woche' },
  plans_free_books: { en: '100 books', de: '100 Bücher' },
  plans_pro_feats: { en: 'unlimited uploads · full history · deep insights', de: 'unbegrenzte Uploads · voller Verlauf · tiefe Insights' },
  plans_mo: { en: 'month', de: 'Monat' },
  plans_yr: { en: 'or €36/year', de: 'oder 36 €/Jahr' },

  // auth
  auth_email: { en: 'Email', de: 'E-Mail' },
  auth_continue: { en: 'Continue', de: 'Weiter' },
  auth_password: { en: 'Password', de: 'Passwort' },
  auth_signin: { en: 'Sign in', de: 'Anmelden' },
  auth_new_here: { en: 'new here — pick a password', de: 'neu hier — wähle ein Passwort' },
  auth_name_opt: { en: 'Name (optional)', de: 'Name (optional)' },
  auth_create: { en: 'Create account', de: 'Konto erstellen' },
  auth_or: { en: 'or', de: 'oder' },
  auth_with: { en: 'Continue with', de: 'Weiter mit' },
  auth_code_send: { en: 'email me a code instead', de: 'stattdessen Code per E-Mail' },
  auth_code_sent: { en: 'code sent — check your inbox', de: 'Code verschickt — prüf dein Postfach' },
  auth_code_label: { en: '6-digit code', de: '6-stelliger Code' },
  auth_code_verify: { en: 'Verify', de: 'Bestätigen' },
  auth_back: { en: 'back', de: 'zurück' },
  auth_password_hint: { en: 'at least 8 characters', de: 'mindestens 8 Zeichen' },
  working: { en: 'working', de: 'lädt' },

  // library
  continue_k: { en: 'CONTINUE', de: 'WEITERLESEN' },
  resume: { en: 'Resume', de: 'Fortsetzen' },
  left: { en: 'left', de: 'übrig' },
  done: { en: 'done', de: 'fertig' },
  books_k: { en: 'BOOKS', de: 'BÜCHER' },
  words_read_k: { en: 'WORDS READ', de: 'WÖRTER GELESEN' },
  day_streak_k: { en: 'DAY STREAK', de: 'TAGE-SERIE' },
  avg_wpm_k: { en: 'AVG WPM', de: 'Ø WPM' },
  today_k: { en: 'TODAY', de: 'HEUTE' },
  add: { en: 'add', de: 'neu' },
  add_something: { en: 'Add something to read', de: 'Etwas zum Lesen hinzufügen' },
  paste_label: { en: 'Paste text', de: 'Text einfügen' },
  paste_ph: { en: 'paste anything…', de: 'füg irgendwas ein…' },
  title_opt: { en: 'Title (optional)', de: 'Titel (optional)' },
  add_text: { en: 'Add text', de: 'Text hinzufügen' },
  drop_file: { en: 'drop a PDF · EPUB · TXT here', de: 'PDF · EPUB · TXT hier ablegen' },
  choose_file: { en: 'choose a file…', de: 'Datei wählen…' },
  url_label: { en: 'Link (article, PDF, EPUB…)', de: 'Link (Artikel, PDF, EPUB…)' },
  import_url: { en: 'Import link', de: 'Link importieren' },
  search_ph: { en: 'search…', de: 'suchen…' },
  from_catalog: { en: 'from the shelf', de: 'vom Regal' },
  delete_q: { en: 'delete?', de: 'löschen?' },
  del: { en: 'del', de: 'lösch' },
  close: { en: 'close', de: 'schließen' },
  cancel: { en: 'cancel', de: 'abbrechen' },
  stats_link: { en: 'stats', de: 'Statistik' },
  library_link: { en: 'library', de: 'Bibliothek' },
  loading: { en: 'loading', de: 'lädt' },
  words: { en: 'words', de: 'Wörter' },

  // reader
  pause: { en: 'Pause', de: 'Pause' },
  play: { en: 'Play', de: 'Start' },
  replay: { en: 'Replay', de: 'Nochmal' },
  reader_hint_kbd: { en: 'space play/pause · ←→ sentence · esc back', de: 'Leertaste Start/Pause · ←→ Satz · Esc zurück' },
  reader_hint_touch: { en: 'tap sides for sentence · center play/pause', de: 'Seiten tippen: Satz · Mitte: Start/Pause' },

  // stats
  stats_title: { en: 'Stats', de: 'Statistik' },
  best_k: { en: 'BEST', de: 'REKORD' },
  total_k: { en: 'TOTAL WORDS', de: 'WÖRTER GESAMT' },
  goal_k: { en: 'DAILY GOAL', de: 'TAGESZIEL' },
  last_days: { en: 'LAST 6 WEEKS', de: 'LETZTE 6 WOCHEN' },
  sessions_k: { en: 'SESSIONS', de: 'SITZUNGEN' },
  no_sessions: { en: 'no sessions yet — read something', de: 'noch keine Sitzungen — lies etwas' },

  // streak overlay
  streak_kept: { en: 'streak kept', de: 'Serie gehalten' },
  day: { en: 'day', de: 'Tag' },
  days: { en: 'days', de: 'Tage' },
  tap_to_continue: { en: 'tap to continue', de: 'tippen zum Fortfahren' },

  // onboarding
  ob_handle: { en: 'Pick a handle', de: 'Wähl einen Namen' },
  ob_handle_hint: { en: '2–24 chars · a–z 0–9 _ -', de: '2–24 Zeichen · a–z 0–9 _ -' },
  ob_speed_hint: { en: 'speed up until it just barely breaks, then back off.', de: 'schneller, bis es gerade so kippt — dann einen Tick zurück.' },
  ob_next: { en: 'next', de: 'weiter' },
  ob_finish: { en: 'finish', de: 'fertig' },
  ob_skip: { en: 'skip', de: 'überspringen' },
  ob_back: { en: 'back', de: 'zurück' },

  // v0.8: reader context/sentence view
  ctx_k: { en: 'sentence', de: 'Satz' },
  read_only_note: {
    en: 'read-only — not saved to your library',
    de: 'nur lesen — nicht in deiner Bibliothek gespeichert',
  },

  // v0.8: share menu
  share_can_do: { en: 'what can they do?', de: 'was dürfen sie?' },
  share_import_opt: { en: 'add to their library', de: 'in ihre Bibliothek' },
  share_read_opt: { en: 'read only', de: 'nur lesen' },
  share_native: { en: 'share…', de: 'teilen…' },
  share_copy: { en: 'copy link', de: 'Link kopieren' },
  share_with_friend: { en: 'invite a friend to flick', de: 'Freund zu flick einladen' },
  share_title: { en: 'Share', de: 'Teilen' },

  // v0.8: register perks
  reg_perks_head: { en: 'your account keeps', de: 'dein Konto sichert' },
  reg_perk_sync: {
    en: 'library, position & speed on every device',
    de: 'Bibliothek, Position & Tempo auf jedem Gerät',
  },
  reg_perk_streak: { en: 'your streak and daily goal', de: 'deine Serie und dein Tagesziel' },
  reg_perk_stats: {
    en: 'full stats, history & yearly wrapped',
    de: 'volle Statistik, Verlauf & Jahresrückblick',
  },
  reg_perk_social: {
    en: 'friends, invites & Pro credits',
    de: 'Freunde, Einladungen & Pro-Guthaben',
  },

  // v0.8: onboarding avatar
  ob_avatar: { en: 'Add a photo', de: 'Füg ein Foto hinzu' },
  ob_avatar_hint: { en: 'optional — a small square picture', de: 'optional — ein kleines quadratisches Bild' },
  ob_avatar_pick: { en: 'choose image', de: 'Bild wählen' },
  ob_avatar_remove: { en: 'remove', de: 'entfernen' },

  // v0.8: account menu
  account_k: { en: 'account', de: 'Konto' },

  // v0.8: invite steps (readability)
  inv_step1: { en: 'share your invite link', de: 'teile deinen Einladungslink' },
  inv_step2: { en: 'they join and really read', de: 'sie treten bei und lesen wirklich' },
  inv_step3: { en: 'you both get 30 days of Pro', de: 'ihr bekommt beide 30 Tage Pro' },
  inv_how: { en: 'how it works', de: 'so geht’s' },

  // v0.8: read-only share landing
  shared_read_only: {
    en: 'read-only — you can read it here, but not keep a copy',
    de: 'nur lesen — hier lesbar, aber nicht speicherbar',
  },
  shared_read_go: { en: 'Read now', de: 'Jetzt lesen' },

  // v0.8: landing redesign (how-it-works, numbers, spec sheet)
  lp_how_lead: { en: 'how it works', de: 'so funktioniert’s' },
  lp_how1_t: { en: 'one word at a time', de: 'ein Wort nach dem anderen' },
  lp_how1_d: {
    en: 'No pages, no columns, no lines to track. The text comes to you — one word, always in the same place.',
    de: 'Keine Seiten, keine Spalten, keine Zeilen. Der Text kommt zu dir — ein Wort, immer an derselben Stelle.',
  },
  lp_how2_t: { en: 'the pivot letter', de: 'der Fixpunkt' },
  lp_how2_d: {
    en: 'One letter is set in the accent — the optimal recognition point. Every word lands aligned to it, so your eye locks on and never travels.',
    de: 'Ein Buchstabe steht in der Akzentfarbe — der optimale Erkennungspunkt. Jedes Wort richtet sich daran aus, dein Auge rastet ein und wandert nie.',
  },
  lp_how3_t: { en: 'your pace', de: 'dein Tempo' },
  lp_how3_d: {
    en: 'Push the speed until the words just barely break apart, then back off a notch. That is your pace — and it climbs with practice.',
    de: 'Dreh das Tempo hoch, bis die Wörter gerade zu zerfallen beginnen, dann geh einen Tick zurück. Das ist dein Tempo — und es wächst mit Übung.',
  },
  lp_num_lead: { en: 'the numbers', de: 'die Zahlen' },
  lp_num_avg: { en: 'the average reader', de: 'der Durchschnittsleser' },
  lp_num_demo: { en: 'the demo above', de: 'die Demo oben' },
  lp_num_saccades: { en: 'your eye stays put', de: 'dein Auge bleibt still' },
  lp_spec_engine_k: { en: 'engine', de: 'Engine' },
  lp_spec_engine_v: { en: 'rust + svelte · AGPL open source', de: 'Rust + Svelte · AGPL, quelloffen' },
  lp_spec_privacy_k: { en: 'privacy', de: 'Privatsphäre' },
  lp_spec_privacy_v: {
    en: 'self-hostable — your library stays yours',
    de: 'selbst hostbar — deine Bibliothek bleibt deine',
  },
  lp_spec_formats_k: { en: 'formats', de: 'Formate' },
  lp_spec_formats_v: { en: 'pdf · epub · txt · md · url · paste', de: 'pdf · epub · txt · md · url · einfügen' },
  lp_spec_source_k: { en: 'source', de: 'Quellcode' },

  // errors
  err_generic: { en: 'request failed', de: 'Anfrage fehlgeschlagen' },
};

function browserLang(): 'en' | 'de' | 'es' {
  const l = navigator.language?.toLowerCase() ?? '';
  if (l.startsWith('de')) return 'de';
  if (l.startsWith('es')) return 'es';
  return 'en';
}

function storedLang(): Lang {
  const v = localStorage.getItem(LANG_KEY);
  return v === 'en' || v === 'de' || v === 'es' ? v : 'auto';
}

class I18nState {
  lang = $state<Lang>(storedLang());
  private synced = false;

  get resolved(): 'en' | 'de' | 'es' {
    return this.lang === 'auto' ? browserLang() : this.lang;
  }

  setLang(lang: Lang): void {
    this.lang = lang;
    localStorage.setItem(LANG_KEY, lang);
    if (this.synced) queueSettings({ lang }, 800);
  }

  adopt(lang: Lang): void {
    this.synced = true;
    this.lang = lang;
    localStorage.setItem(LANG_KEY, lang);
  }

  detach(): void {
    this.synced = false;
  }

  t = (key: string): string => {
    // Spanish lives in a merged map (ES over the en fallback); en/de come
    // straight from DICT.
    if (this.resolved === 'es') return ES[key] ?? DICT[key]?.en ?? key;
    const entry = DICT[key];
    if (!entry) return key;
    return entry[this.resolved];
  };
}

export const i18n = new I18nState();
export const t = (key: string): string => i18n.t(key);
