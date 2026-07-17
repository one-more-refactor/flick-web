// Theme application per CONTRACTS.md: `settings.theme` sets `data-theme` on
// the root element; `auto` removes the override and follows prefers-color-scheme.

import type { Theme } from './api';

export const THEMES: Theme[] = ['auto', 'light', 'dark'];

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
}

export function nextTheme(theme: Theme): Theme {
  return THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
}
