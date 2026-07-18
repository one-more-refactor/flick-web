// Tiny i18n (CONTRACTS.md: settings.lang auto/en/de). `auto` follows the
// browser. Brand language (FLICK_, theme names, "read it in a flick") is
// never translated — it IS the brand.

import type { Lang } from './api';
import { queueSettings } from './settings';

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
  plans_free_feats: { en: 'reader · all themes · stats · streaks · every import · search', de: 'Reader · alle Themes · Statistik · Serien · alle Importe · Suche' },
  plans_free_books: { en: '100 books', de: '100 Bücher' },
  plans_pro_feats: { en: 'unlimited shelf · cloud imports · auto-capture', de: 'unbegrenztes Regal · Cloud-Importe · Auto-Capture' },
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

  // errors
  err_generic: { en: 'request failed', de: 'Anfrage fehlgeschlagen' },
};

function browserLang(): 'en' | 'de' {
  return navigator.language?.toLowerCase().startsWith('de') ? 'de' : 'en';
}

function storedLang(): Lang {
  const v = localStorage.getItem(LANG_KEY);
  return v === 'en' || v === 'de' ? v : 'auto';
}

class I18nState {
  lang = $state<Lang>(storedLang());
  private synced = false;

  get resolved(): 'en' | 'de' {
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
    const entry = DICT[key];
    if (!entry) return key;
    return entry[this.resolved];
  };
}

export const i18n = new I18nState();
export const t = (key: string): string => i18n.t(key);
