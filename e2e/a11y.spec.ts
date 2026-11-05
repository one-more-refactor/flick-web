// Accessibility: automated axe-core scans of every screen on the reading
// journey, plus the keyboard-and-screen-reader contract the reader promises.
//
// Policy: critical/serious WCAG 2.1 A/AA violations fail the build.
// Colour contrast is reported (attached to the test as JSON) but not
// enforced — the six themes are a design decision that deserves a human
// review, not a red CI badge. Flip ENFORCE_CONTRAST once they are audited.

import AxeBuilder from '@axe-core/playwright';
import type { Page, TestInfo } from '@playwright/test';
import { test, expect, reader } from './fixtures';

const ENFORCE_CONTRAST = false;

async function scan(page: Page, info: TestInfo, name: string) {
  // Let entrance animations settle so axe sees final colours and layout.
  await page.waitForTimeout(300);
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  await info.attach(`axe-${name}.json`, {
    body: JSON.stringify(results.violations, null, 2),
    contentType: 'application/json',
  });
  const blocking = results.violations.filter(
    (v) =>
      (v.impact === 'critical' || v.impact === 'serious') &&
      (ENFORCE_CONTRAST || v.id !== 'color-contrast'),
  );
  const summary = blocking.map(
    (v) => `${v.id} (${v.impact}): ${v.help}\n    ${v.nodes.map((n) => n.target.join(' ')).join('\n    ')}`,
  );
  expect(summary, `axe found blocking violations on ${name}`).toEqual([]);
}

for (const mode of ['light', 'dark'] as const) {
  test.describe(`axe — ${mode}`, () => {
    test.use({ reducedMotion: 'reduce', colorScheme: mode });

    test('landing', async ({ page }, info) => {
      await page.goto('/');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await scan(page, info, `landing-${mode}`);
    });

    test.describe('signed in', () => {
      test.use({ mockOptions: { signedIn: true, library: ['pride', 'raven', 'meditations'] } });

      test('library', async ({ page }, info) => {
        await page.goto('/');
        await expect(page.locator('.rcard').first()).toBeVisible();
        await scan(page, info, `library-${mode}`);
      });

      test('add wizard', async ({ page }, info) => {
        await page.goto('/');
        await page.getByRole('button', { name: /\+ add/i }).click();
        await expect(page.getByRole('dialog')).toBeVisible();
        await scan(page, info, `wizard-${mode}`);
      });

      test('reader', async ({ page }, info) => {
        await page.goto('/read/b0001');
        await expect(reader(page).title).toBeVisible();
        await scan(page, info, `reader-${mode}`);
      });
    });
  });
}

test.describe('reader semantics', () => {
  test.use({ reducedMotion: 'reduce', mockOptions: { signedIn: true } });

  test('controls are named, and state changes are announced politely', async ({ page }) => {
    await page.goto('/read/b0001');
    const r = reader(page);

    await expect(page.getByRole('region', { name: 'Reader' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();
    await expect(r.wpm).toHaveAttribute('aria-valuetext', '300 words per minute');
    const progress = page.getByRole('progressbar', { name: 'Reading progress' });
    await expect(progress).toHaveAttribute('aria-valuenow', '1');

    // The live region speaks play state — never the words themselves
    // (a word-per-tick live region would drown a screen reader).
    const status = page.locator('.readerview [role="status"]');
    await page.keyboard.press('Space');
    await expect(status).toHaveText(/playing/i);
    await page.keyboard.press('Space');
    await expect(status).toHaveText(/paused/i);
  });

  test('the whole reader is operable from the keyboard alone', async ({ page }) => {
    await page.goto('/read/b0001');
    const r = reader(page);
    // Tab reaches the back link, the play button and the speed slider.
    const reached = new Set<string>();
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab');
      const name = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        return el?.getAttribute('aria-label') ?? el?.textContent?.trim() ?? '';
      });
      reached.add(name);
    }
    expect([...reached].some((n) => /library/i.test(n))).toBe(true);
    expect(reached).toContain('Play');
    expect(reached).toContain('Words per minute');
    await expect(r.root).toBeVisible();
  });

  test('<html lang> follows the language switch', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await page.locator('footer .lang-opt', { hasText: /^de$/ }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'de');
  });
});
