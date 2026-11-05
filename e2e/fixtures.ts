// Shared Playwright fixtures: every test gets a fresh in-memory backend
// (`mock`), already wired into its page before the first navigation.

import { test as base, expect, type Page } from '@playwright/test';
import { MockApi, toTimeline, DEMO_TEXTS, type MockOptions } from './mock-api';

export const test = base.extend<{ mockOptions: MockOptions; mock: MockApi }>({
  mockOptions: [{}, { option: true }],
  // auto: every page talks to the mock, even in tests that never touch it.
  mock: [
    async ({ page, mockOptions }, use) => {
      const mock = new MockApi(mockOptions);
      await mock.install(page);
      await use(mock);
    },
    { auto: true },
  ],
});

export { expect, toTimeline, DEMO_TEXTS };

/** The reader's `001 / 067`-style counter for a 0-based word index. */
export function counterText(index: number, total: number): string {
  const len = Math.max(3, String(total).length);
  const pad = (n: number) => String(n).padStart(len, '0');
  return `${pad(index + 1)} / ${pad(total)}`;
}

/** Locators for the reader view, in one place so the specs read like prose. */
export function reader(page: Page) {
  const root = page.locator('.readerview');
  return {
    root,
    title: root.locator('.btitle'),
    counter: root.locator('.counter'),
    word: root.locator('.stage .word'),
    pivot: root.locator('.stage .word .orp'),
    play: root.locator('.controls .playbtn'),
    wpm: page.getByRole('slider', { name: 'Words per minute' }),
    wpmValue: root.locator('.wpm-val'),
    scrubber: root.locator('.progress.scrub'),
    back: root.locator('.backbtn'),
  };
}
