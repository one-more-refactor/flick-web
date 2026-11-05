// The reading flow, end to end: landing → guest → library → reader → back.
// Runs against the built app with an in-memory backend (see mock-api.ts).

import { test, expect, reader, counterText, toTimeline, DEMO_TEXTS } from './fixtures';

const INTRO = toTimeline(DEMO_TEXTS.intro.text);
const TOTAL = INTRO.length;
/** 0-based index of the first word of each sentence in the intro text. */
const SENTENCE_STARTS = [0, ...INTRO.flatMap((w, i) => (w[2] >= 2 && i + 1 < TOTAL ? [i + 1] : []))];

test.describe('guest-first reading flow', () => {
  // Reduced motion: the reader never autoplays, so every step is explicit.
  test.use({ reducedMotion: 'reduce' });

  test('start reading as a guest, play, pause, and resume from the saved place', async ({ page, mock }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    await page.getByRole('button', { name: /start reading/i }).first().click();
    await expect.poll(() => mock.user?.guest).toBe(true);

    // The fresh library suggests its one book as a "start here" card.
    const card = page.locator('.rcard', { hasText: DEMO_TEXTS.intro.title });
    await expect(card).toBeVisible();
    await card.click();

    const r = reader(page);
    await expect(page).toHaveURL(/\/read\/b0001$/);
    await expect(page).toHaveTitle(`${DEMO_TEXTS.intro.title} — flick`);
    await expect(r.title).toHaveText(DEMO_TEXTS.intro.title);
    await expect(r.counter).toHaveText(counterText(0, TOTAL));
    await expect(r.play).toHaveAttribute('aria-label', 'Play');

    // Space plays; the counter moves on its own.
    await page.keyboard.press('Space');
    await expect(r.play).toHaveAttribute('aria-label', 'Pause');
    await expect(r.counter).not.toHaveText(counterText(0, TOTAL), { timeout: 5_000 });

    // Space again pauses and reports the position (+ words read) to the server.
    await page.waitForTimeout(800);
    await page.keyboard.press('Space');
    await expect(r.play).toHaveAttribute('aria-label', 'Play');
    await expect.poll(() => mock.positions.length).toBeGreaterThan(0);
    const saved = mock.positions.at(-1)!;
    expect(saved.id).toBe('b0001');
    expect(saved.position).toBeGreaterThan(0);
    expect(saved.read).toBeGreaterThan(0);
    expect(saved.day).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const pausedAt = await r.counter.textContent();

    // Esc leaves the reader; the library now shows the book in progress.
    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('.rcard', { hasText: DEMO_TEXTS.intro.title })).toContainText(/continue/i);

    // Re-opening resumes exactly where we paused.
    await page.locator('.rcard', { hasText: DEMO_TEXTS.intro.title }).click();
    await expect(r.counter).toHaveText(pausedAt!);
  });

  test('pick a classic from the landing shelf and land straight in the reader', async ({ page, mock }) => {
    await page.goto('/');
    await page.locator('.lp-pickrow', { hasText: DEMO_TEXTS.raven.title }).click();
    const r = reader(page);
    await expect(r.title).toHaveText(DEMO_TEXTS.raven.title);
    expect([...mock.books.values()].map((b) => b.title)).toContain(DEMO_TEXTS.raven.title);
  });
});

test.describe('reader controls', () => {
  test.use({ reducedMotion: 'reduce', mockOptions: { signedIn: true } });

  test('a /read/:id deep link opens the reader with the ORP pivot marked', async ({ page }) => {
    await page.goto('/read/b0001');
    const r = reader(page);
    await expect(r.counter).toHaveText(counterText(0, TOTAL));
    // "Welcome": 7 letters → pivot at index 2, the "l".
    await expect(r.word).toHaveText(INTRO[0][0]);
    await expect(r.pivot).toHaveText(INTRO[0][0].charAt(INTRO[0][1]));
  });

  test('arrow keys step by sentence', async ({ page }) => {
    await page.goto('/read/b0001');
    const r = reader(page);
    await expect(r.counter).toHaveText(counterText(0, TOTAL));

    await page.keyboard.press('ArrowRight');
    await expect(r.counter).toHaveText(counterText(SENTENCE_STARTS[1], TOTAL));
    await page.keyboard.press('ArrowRight');
    await expect(r.counter).toHaveText(counterText(SENTENCE_STARTS[2], TOTAL));
    await expect(r.word).toHaveText(INTRO[SENTENCE_STARTS[2]][0]);

    await page.keyboard.press('ArrowLeft');
    await expect(r.counter).toHaveText(counterText(SENTENCE_STARTS[1], TOTAL));
  });

  test('the WPM slider follows the keyboard and persists to the account', async ({ page, mock }) => {
    await page.goto('/read/b0001');
    const r = reader(page);
    await expect(r.wpmValue).toContainText('300');

    await r.wpm.focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await expect(r.wpmValue).toContainText('350');
    // Arrow keys on the slider must not also seek the text.
    await expect(r.counter).toHaveText(counterText(0, TOTAL));

    // Settings PATCHes are debounced (~2 s) and merged.
    await expect
      .poll(() => mock.settingsPatches.some((p) => (p as { settings?: { wpm?: number } }).settings?.wpm === 350), {
        timeout: 6_000,
      })
      .toBe(true);
  });

  test('scrub to the end, finish, and offer a replay', async ({ page, mock }) => {
    await page.goto('/read/b0001');
    const r = reader(page);
    const box = (await r.scrubber.boundingBox())!;
    // The last half-pixel of the bar rounds to the final word.
    await page.mouse.click(box.x + box.width - 0.5, box.y + box.height / 2);
    await expect(r.counter).toHaveText(counterText(TOTAL - 1, TOTAL));

    await r.play.click();
    await expect(r.play).toHaveAttribute('aria-label', 'Replay', { timeout: 5_000 });
    // A finished book is saved at word_count, so the library shows it done.
    await expect.poll(() => mock.positions.at(-1)?.position).toBe(TOTAL);
  });

  test('zen mode hides the chrome; Esc leaves zen before it leaves the book', async ({ page }) => {
    await page.goto('/read/b0001');
    const r = reader(page);
    await page.keyboard.press('z');
    await expect(r.root).toHaveClass(/\bzen\b/);
    await page.keyboard.press('Escape');
    await expect(r.root).not.toHaveClass(/\bzen\b/);
    await expect(page).toHaveURL(/\/read\/b0001$/);
    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(/\/$/);
  });

  test('the browser back button returns to the library and saves the place', async ({ page, mock }) => {
    await page.goto('/');
    await page.locator('.rcard', { hasText: DEMO_TEXTS.intro.title }).click();
    const r = reader(page);
    await expect(r.title).toBeVisible();
    await page.keyboard.press('ArrowRight');
    await expect(r.counter).toHaveText(counterText(SENTENCE_STARTS[1], TOTAL));

    await page.goBack();
    await expect(page.locator('.lib')).toBeVisible();
    await expect.poll(() => mock.positions.at(-1)?.position).toBe(SENTENCE_STARTS[1]);
  });

  test('paste text in the add wizard and read it immediately', async ({ page, mock }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /\+ add/i }).click();
    const wiz = page.getByRole('dialog');
    await wiz.getByRole('button', { name: /paste text/i }).click();
    await wiz.getByLabel(/paste text/i).fill(DEMO_TEXTS.meditations.text);
    await wiz.getByLabel(/title/i).fill('Morning notes');
    await wiz.getByRole('button', { name: /add & read/i }).click();

    const r = reader(page);
    await expect(r.title).toHaveText('Morning notes');
    await expect(r.counter).toHaveText(counterText(0, toTimeline(DEMO_TEXTS.meditations.text).length));
    expect([...mock.books.values()].some((b) => b.title === 'Morning notes')).toBe(true);
  });
});

test.describe('motion', () => {
  test.use({ reducedMotion: 'no-preference', mockOptions: { signedIn: true } });

  test('the reader autoplays when motion is welcome', async ({ page }) => {
    await page.goto('/read/b0001');
    const r = reader(page);
    await expect(r.play).toHaveAttribute('aria-label', 'Pause');
    await expect(r.counter).not.toHaveText(counterText(0, TOTAL), { timeout: 5_000 });
  });
});
