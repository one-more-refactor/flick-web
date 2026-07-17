// The flick theme system (docs/DESIGN-BRIEF-v0.3.md, ported from the v0.4
// landing mockup). Two orthogonal axes, both stamped on <html>:
//
//   data-mode  = light | dark      — the "flicker", auto follows the system
//   data-theme = paper | signal | sage | tide | dusk | noir
//
// The server stores mode as `settings.theme` (auto/light/dark) and the named
// theme as `settings.accent` under its legacy slug — the mapping lives here
// and nowhere else. localStorage keeps both across reloads for guests and
// logged-out visitors; the account is the source of truth once signed in.

import type { Accent, Mode, Settings } from './api';
import { queueSettings } from './settings';

export type ThemeName = 'paper' | 'signal' | 'sage' | 'tide' | 'dusk' | 'noir';

export const THEME_NAMES: ThemeName[] = ['paper', 'signal', 'sage', 'tide', 'dusk', 'noir'];

/** Swatch color per theme (light-ground accent), for the selector chips. */
export const THEME_SWATCH: Record<ThemeName, string> = {
  paper: '#D8342B',
  signal: '#E5231B',
  sage: '#3E8A00',
  tide: '#0071B8',
  dusk: '#7A3DD4',
  noir: '#1A1512',
};

const ACCENT_TO_THEME: Record<Accent, ThemeName> = {
  red: 'paper',
  ember: 'signal',
  acid: 'sage',
  cyan: 'tide',
  violet: 'dusk',
  mono: 'noir',
};
const THEME_TO_ACCENT = Object.fromEntries(
  Object.entries(ACCENT_TO_THEME).map(([a, t]) => [t, a]),
) as Record<ThemeName, Accent>;

const MODE_KEY = 'flick.mode';
const THEME_KEY = 'flick.theme';

function storedMode(): Mode {
  const v = localStorage.getItem(MODE_KEY);
  return v === 'light' || v === 'dark' ? v : 'auto';
}
function storedTheme(): ThemeName {
  const v = localStorage.getItem(THEME_KEY);
  return THEME_NAMES.includes(v as ThemeName) ? (v as ThemeName) : 'paper';
}

const media = window.matchMedia('(prefers-color-scheme: dark)');

class ThemeState {
  mode = $state<Mode>(storedMode());
  theme = $state<ThemeName>(storedTheme());
  private system = $state<'light' | 'dark'>(media.matches ? 'dark' : 'light');
  /** Whether changes should also persist to the account (set once signed in). */
  private synced = false;

  constructor() {
    media.addEventListener('change', (e) => {
      this.system = e.matches ? 'dark' : 'light';
      this.stamp();
    });
    this.stamp();
  }

  /** The mode actually rendered right now. */
  get resolved(): 'light' | 'dark' {
    return this.mode === 'auto' ? this.system : this.mode;
  }

  get accent(): Accent {
    return THEME_TO_ACCENT[this.theme];
  }

  private stamp(): void {
    const root = document.documentElement;
    root.setAttribute('data-mode', this.resolved);
    root.setAttribute('data-theme', this.theme);
  }

  private persist(patch: Partial<Settings>): void {
    localStorage.setItem(MODE_KEY, this.mode);
    localStorage.setItem(THEME_KEY, this.theme);
    if (this.synced) queueSettings(patch, 800);
  }

  /** Flip light ↔ dark (an explicit flick always leaves `auto`). */
  flick(): void {
    this.mode = this.resolved === 'dark' ? 'light' : 'dark';
    this.stamp();
    this.persist({ theme: this.mode });
  }

  setMode(mode: Mode): void {
    this.mode = mode;
    this.stamp();
    this.persist({ theme: mode });
  }

  setTheme(theme: ThemeName): void {
    this.theme = theme;
    this.stamp();
    this.persist({ accent: THEME_TO_ACCENT[theme] });
  }

  /** Adopt account settings on sign-in/boot; account wins over localStorage. */
  adopt(settings: Settings): void {
    this.synced = true;
    this.mode = settings.theme;
    this.theme = ACCENT_TO_THEME[settings.accent] ?? 'paper';
    localStorage.setItem(MODE_KEY, this.mode);
    localStorage.setItem(THEME_KEY, this.theme);
    this.stamp();
  }

  /** Back to local-only persistence (logout). */
  detach(): void {
    this.synced = false;
  }
}

export const themeState = new ThemeState();
