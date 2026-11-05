// An in-memory stand-in for flick-backend, served through Playwright's
// request interception. The e2e suite and the media capture both use it, so
// neither needs a running server (or a database, or a network).
//
// It implements only the slice of docs/CONTRACTS.md (in the flick repo) the
// web client exercises on its main journeys. Shapes mirror src/lib/api.ts —
// if that file changes, this one should too. Unknown endpoints answer 404 so
// a missing route shows up as a visible failure, never as silent success.

import type { Page, Route } from '@playwright/test';
import type { Book, CatalogEntry, Stats, TimelineWord, User } from '../src/lib/api';

/** Words the reader treats as sentence boundaries carry weight >= 2.0. */
export function toTimeline(text: string): TimelineWord[] {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((w): TimelineWord => {
      const core = w.replace(/[^\p{L}\p{N}]+$/u, '');
      const n = core.length;
      const orp = n <= 1 ? 0 : n <= 5 ? 1 : n <= 9 ? 2 : n <= 13 ? 3 : 4;
      let weight = 1;
      if (/[.!?]["')\]]*$/.test(w)) weight = 2.5;
      else if (/[,;:]$/.test(w)) weight = 1.5;
      else if (n > 8) weight = 1.2;
      return [w, orp, weight];
    });
}

/** Public-domain demo texts — no real user data anywhere in the fixtures. */
export const DEMO_TEXTS = {
  intro: {
    title: 'How flick works',
    author: 'flick',
    source: 'intro',
    category: 'guide',
    text:
      'Welcome to flick. Words arrive one at a time, right where your eyes already are. ' +
      'The red letter is the pivot: your eye locks onto it, so it never has to travel. ' +
      'Press space to pause, and the arrows to jump a sentence. ' +
      'Drag the slider to go faster; the reader eases in so the first words never feel rushed. ' +
      'When you are done, press escape and your place is saved.',
  },
  raven: {
    title: 'The Raven',
    author: 'Edgar Allan Poe',
    source: 'catalog',
    category: 'poetry',
    text:
      'Once upon a midnight dreary, while I pondered, weak and weary, ' +
      'over many a quaint and curious volume of forgotten lore. ' +
      'While I nodded, nearly napping, suddenly there came a tapping, ' +
      'as of some one gently rapping, rapping at my chamber door. ' +
      'Tis some visitor, I muttered, tapping at my chamber door. Only this and nothing more.',
  },
  pride: {
    title: 'Pride and Prejudice',
    author: 'Jane Austen',
    source: 'catalog',
    category: 'novel',
    text:
      'It is a truth universally acknowledged, that a single man in possession of a good fortune, ' +
      'must be in want of a wife. However little known the feelings or views of such a man may be ' +
      'on his first entering a neighbourhood, this truth is so well fixed in the minds of the ' +
      'surrounding families, that he is considered the rightful property of some one or other ' +
      'of their daughters.',
  },
  meditations: {
    title: 'Meditations',
    author: 'Marcus Aurelius',
    source: 'catalog',
    category: 'philosophy',
    text:
      'Begin the morning by saying to thyself, I shall meet with the busy-body, the ungrateful, ' +
      'arrogant, deceitful, envious, unsocial. All these things happen to them by reason of their ' +
      'ignorance of what is good and evil. Very little is needed to make a happy life.',
  },
} as const;

type DemoKey = keyof typeof DEMO_TEXTS;

export interface PositionReport {
  id: string;
  position: number;
  read?: number;
  day?: string;
}

export interface MockOptions {
  /** Start with a session already present (skips the landing). */
  signedIn?: boolean;
  /** Seed books beyond the intro (in library order). */
  library?: DemoKey[];
  /** Words per minute stored on the account. */
  wpm?: number;
  /** Today's words + streak, for a lived-in stats strip. */
  today?: number;
  streak?: number;
}

const now = () => Math.floor(Date.now() / 1000);

export class MockApi {
  user: User | null = null;
  books = new Map<string, Book>();
  timelines = new Map<string, TimelineWord[]>();
  positions: PositionReport[] = [];
  sessions: unknown[] = [];
  settingsPatches: unknown[] = [];
  todayWords: number;
  streak: number;
  private seq = 0;

  constructor(private opts: MockOptions = {}) {
    this.todayWords = opts.today ?? 0;
    this.streak = opts.streak ?? 0;
    if (opts.signedIn) this.mintUser(false);
  }

  private id(): string {
    this.seq += 1;
    return `b${String(this.seq).padStart(4, '0')}`;
  }

  private mintUser(guest: boolean): User {
    this.user = {
      id: 'u0001',
      email: guest ? null : 'reader@example.com',
      name: guest ? '' : 'Demo Reader',
      username: guest ? null : 'demo',
      guest,
      onboarded: true,
      plan: 'free',
      pro_active: false,
      avatar: null,
      settings: { wpm: this.opts.wpm ?? 300, theme: 'auto', accent: 'red', lang: 'en' },
    };
    this.addBook('intro', { last_read_at: null });
    // Seeded extras look lived-in: read recently, part-way through.
    const progress = [0.42, 0.15, 0.7];
    (this.opts.library ?? []).forEach((key, i) => {
      const b = this.addBook(key, { last_read_at: now() - (i + 1) * 3600 });
      b.position = Math.floor(b.word_count * progress[i % progress.length]);
    });
    return this.user;
  }

  /** Add a demo text to the library; returns the new book. */
  addBook(key: DemoKey, extra: Partial<Book> = {}): Book {
    const d = DEMO_TEXTS[key];
    return this.createBook(d.text, d.title, { author: d.author, source: d.source, category: d.category, ...extra });
  }

  createBook(text: string, title?: string, extra: Partial<Book> = {}): Book {
    const words = toTimeline(text);
    const id = this.id();
    const book: Book = {
      id,
      title: title ?? words.slice(0, 6).map((w) => w[0]).join(' '),
      source: 'paste',
      word_count: words.length,
      position: 0,
      created_at: now() - this.seq * 3600,
      last_read_at: null,
      author: null,
      url: null,
      favicon: null,
      excerpt: text.slice(0, 140),
      category: null,
      tags: [],
      ...extra,
    };
    if (book.category && book.tags.length === 0) book.tags = [book.category];
    this.books.set(id, book);
    this.timelines.set(id, words);
    return book;
  }

  catalog(): CatalogEntry[] {
    return (['raven', 'pride', 'meditations'] as DemoKey[]).map((slug) => ({
      slug,
      title: DEMO_TEXTS[slug].title,
      author: DEMO_TEXTS[slug].author,
      lang: 'en',
      kind: slug === 'meditations' ? 'essay' : 'story',
      description: DEMO_TEXTS[slug].category,
      word_count: toTimeline(DEMO_TEXTS[slug].text).length,
    }));
  }

  stats(): Stats {
    const day = new Date();
    const days = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(day.getTime() - (13 - i) * 86_400_000);
      return { day: d.toISOString().slice(0, 10), words: i === 13 ? this.todayWords : (i * 137) % 900 };
    });
    return {
      today: { day: days[13].day, words: this.todayWords },
      total_words: days.reduce((a, d) => a + d.words, 0),
      goal: 300,
      streak: { current: this.streak, best: Math.max(this.streak, 12) },
      days,
    };
  }

  /** Wire the mock into a page. Call before the first navigation. */
  async install(page: Page): Promise<void> {
    await page.route('**/api/**', (route) => this.handle(route));
  }

  private async handle(route: Route): Promise<void> {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname.replace(/^\/api/, '');
    const method = req.method();
    const body = (): Record<string, unknown> => {
      try {
        return (req.postDataJSON() as Record<string, unknown>) ?? {};
      } catch {
        return {};
      }
    };
    const json = (status: number, data?: unknown) =>
      route.fulfill(
        data === undefined
          ? { status }
          : { status, contentType: 'application/json', body: JSON.stringify(data) },
      );
    const authed = () => this.user !== null;
    const unauthorized = () => json(401, { error: 'unauthorized' });

    // ---- public ----
    if (method === 'GET' && path === '/meta') {
      return json(200, { edition: 'selfhost', version: 'e2e', announcement: null, admin_url: null });
    }
    if (method === 'GET' && path === '/catalog') return json(200, this.catalog());
    if (method === 'GET' && path === '/events/active') return json(200, []);
    if (method === 'GET' && path === '/auth/providers') return json(200, { providers: [] });

    // ---- auth ----
    if (path === '/auth/me') {
      if (!authed()) return unauthorized();
      if (method === 'GET') return json(200, this.user);
      if (method === 'PATCH') {
        const patch = body();
        this.settingsPatches.push(patch);
        const s = (patch.settings ?? {}) as Partial<User['settings']>;
        this.user = { ...this.user!, ...patch, settings: { ...this.user!.settings, ...s } } as User;
        return json(200, this.user);
      }
    }
    if (method === 'POST' && path === '/auth/guest') return json(200, this.mintUser(true));
    if (method === 'POST' && path === '/auth/logout') {
      this.user = null;
      return json(204);
    }

    if (!authed()) return unauthorized();

    // ---- stats / social ----
    if (method === 'GET' && path === '/stats') return json(200, this.stats());
    if (path === '/sessions') {
      if (method === 'POST') {
        const s = { id: `s${this.sessions.length + 1}`, ...body() };
        this.sessions.push(s);
        return json(200, s);
      }
      return json(200, []);
    }
    if (method === 'GET' && path === '/friends') return json(200, []);
    if (method === 'GET' && path === '/friends/link') return json(200, { code: 'DEMO', path: '/f/DEMO' });

    // ---- catalog add (409 carries the existing copy's id, contract v0.4.1) ----
    const add = path.match(/^\/catalog\/([\w-]+)\/add$/);
    if (method === 'POST' && add) {
      const slug = add[1] as DemoKey;
      if (!(slug in DEMO_TEXTS)) return json(404, { error: 'unknown catalog entry' });
      const have = [...this.books.values()].find((b) => b.title === DEMO_TEXTS[slug].title);
      if (have) return json(409, { error: 'already in library', book_id: have.id });
      return json(200, this.addBook(slug));
    }

    // ---- books ----
    if (path === '/books' && method === 'GET') {
      const q = url.searchParams.get('q')?.toLowerCase();
      const all = [...this.books.values()];
      return json(
        200,
        q
          ? all.filter(
              (b) =>
                b.title.toLowerCase().includes(q) ||
                (b.author ?? '').toLowerCase().includes(q) ||
                (this.timelines.get(b.id) ?? []).some((w) => w[0].toLowerCase().includes(q)),
            )
          : all,
      );
    }
    if (path === '/books' && method === 'POST') {
      const b = body();
      const text = typeof b.text === 'string' ? b.text : '';
      if (!text.trim()) return json(400, { error: 'empty text' });
      return json(200, this.createBook(text, typeof b.title === 'string' ? b.title : undefined));
    }
    if (path === '/books/trash' && method === 'GET') return json(200, { items: [], retention_days: 30 });

    const m = path.match(/^\/books\/([A-Za-z0-9]+)(\/[a-z]+)?$/);
    if (m) {
      const book = this.books.get(m[1]);
      if (!book) return json(404, { error: 'not found' });
      const sub = m[2] ?? '';
      if (sub === '' && method === 'GET') return json(200, book);
      if (sub === '' && method === 'DELETE') {
        this.books.delete(book.id);
        return json(204);
      }
      if (sub === '/timeline' && method === 'GET') {
        const words = this.timelines.get(book.id)!;
        return json(200, { version: 2, words, word_count: words.length });
      }
      if (sub === '/position' && method === 'PUT') {
        const b = body() as { position: number; read?: number; day?: string };
        this.positions.push({ id: book.id, ...b });
        book.position = b.position;
        book.last_read_at = now();
        this.todayWords += b.read ?? 0;
        return json(204);
      }
      if (sub === '/tags' && method === 'PUT') {
        book.tags = ((body().tags as string[]) ?? []).slice(0, 12);
        return json(200, book);
      }
    }

    return json(404, { error: `mock: no route for ${method} ${path}` });
  }
}
