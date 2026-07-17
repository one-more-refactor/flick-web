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

  // landing
  start_reading: { en: 'Start reading', de: 'Loslesen' },
  already_here: { en: 'already here?', de: 'schon dabei?' },
  log_in_low: { en: 'log in', de: 'anmelden' },
  pick_one_up: { en: 'or pick one up', de: 'oder greif eins auf' },
  min: { en: 'min', de: 'Min' },

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
