// flick web — typed API client. The shape of everything here is bound by
// docs/CONTRACTS.md; change that file first, this one second.

/** Server `settings.theme`: light/dark, or follow the system. */
export type Mode = 'auto' | 'light' | 'dark';
/** Server `settings.accent` slugs. The client maps these onto the six named
 *  themes (paper/signal/sage/tide/dusk/noir) — see theme.svelte.ts. */
export type Accent = 'red' | 'ember' | 'acid' | 'cyan' | 'violet' | 'mono';
export type Lang = 'auto' | 'en' | 'de';

export interface Settings {
  wpm: number;
  theme: Mode;
  accent: Accent;
  lang: Lang;
}

export interface User {
  id: string;
  email: string | null; // null for guests
  name: string;
  username: string | null;
  guest: boolean;
  onboarded: boolean;
  settings: Settings;
}

/** Any subset of the PATCH /api/auth/me body. */
export interface UserPatch {
  username?: string;
  name?: string;
  onboarded?: boolean;
  settings?: Partial<Settings>;
}

export interface Book {
  id: string;
  title: string;
  source: string; // paste | pdf | intro | catalog | epub | url | …
  word_count: number;
  position: number;
  /** Unix timestamps in seconds (as served by flick-server). */
  created_at: number;
  last_read_at: number | null;
  author: string | null;
  url: string | null;
  favicon: string | null;
  excerpt: string | null;
  category: string | null;
}

/** `[text, orp_index, weight]` — array-of-arrays keeps payloads small. */
export type TimelineWord = [string, number, number];

export interface Timeline {
  version: number;
  words: TimelineWord[];
  word_count: number;
}

export interface Provider {
  id: string; // 'oidc' | 'google' | 'github'
  name: string;
}

export interface Lookup {
  exists: boolean;
  /** 'password' | 'code' | provider ids, for the email-first fork. */
  methods: string[];
}

export interface CatalogEntry {
  slug: string;
  title: string;
  author: string;
  lang: string;
  kind: string;
  description: string;
  word_count: number;
}

export interface Stats {
  today: { day: string; words: number };
  total_words: number;
  goal: number;
  streak: { current: number; best: number };
  days: { day: string; words: number }[];
}

export interface ReadingSession {
  id: string;
  book_id: string;
  book_title?: string;
  started_at: number;
  duration_ms: number;
  words: number;
  avg_wpm: number;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

let onUnauthorized: (() => void) | null = null;

/** Called whenever a non-auth endpoint answers 401 (session gone) — the app drops to the landing. */
export function setUnauthorizedHandler(fn: () => void): void {
  onUnauthorized = fn;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, { credentials: 'same-origin', ...init });
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith('/auth/')) onUnauthorized?.();
    let message = `${res.status} ${res.statusText}`;
    try {
      const body: unknown = await res.json();
      if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') {
        message = body.error;
      }
    } catch {
      // body was not JSON — keep the status line
    }
    throw new ApiError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

const json = (body: unknown, method = 'POST'): RequestInit => ({
  method,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

// ---------- auth ----------

export const guest = (): Promise<User> => request<User>('/auth/guest', { method: 'POST' });

export const lookup = (email: string): Promise<Lookup> =>
  request<Lookup>('/auth/lookup', json({ email }));

export const register = (email: string, password: string, name?: string): Promise<User> =>
  request<User>('/auth/register', json(name ? { email, password, name } : { email, password }));

export const login = (email: string, password: string): Promise<User> =>
  request<User>('/auth/login', json({ email, password }));

export const codeRequest = (email: string): Promise<void> =>
  request<void>('/auth/code/request', json({ email }));

export const codeVerify = (email: string, code: string): Promise<User> =>
  request<User>('/auth/code/verify', json({ email, code }));

export const logout = (): Promise<void> => request<void>('/auth/logout', { method: 'POST' });

export const me = (): Promise<User> => request<User>('/auth/me');

export const updateMe = (patch: UserPatch): Promise<User> =>
  request<User>('/auth/me', json(patch, 'PATCH'));

export const providers = (): Promise<Provider[]> =>
  request<{ providers: Provider[] }>('/auth/providers').then((r) => r.providers);

/** SSO entry point — a 302 to the IdP, so navigate to it (never fetch it). */
export const oauthLoginUrl = (id: string): string => `/api/auth/oauth/${id}/login`;

// ---------- books ----------

/** `q` (optional) = FTS search over title/author/text; empty = full library. */
export const books = (q?: string): Promise<Book[]> =>
  request<Book[]>(q && q.trim() ? `/books?q=${encodeURIComponent(q.trim())}` : '/books');

export const book = (id: string): Promise<Book> => request<Book>(`/books/${id}`);

export const createBookFromText = (text: string, title?: string): Promise<Book> =>
  request<Book>('/books', json(title ? { title, text } : { text }));

/** PDF / EPUB / txt / md / Kindle clippings — the server sniffs the bytes. */
export const createBookFromFile = (file: File, title?: string): Promise<Book> => {
  const form = new FormData();
  form.append('file', file);
  if (title) form.append('title', title);
  return request<Book>('/books', { method: 'POST', body: form });
};

/** Server-side fetch + readability extraction (articles, or direct file links). */
export const importUrl = (url: string, title?: string): Promise<Book> =>
  request<Book>('/import/url', json(title ? { url, title } : { url }));

export const timeline = (id: string): Promise<Timeline> =>
  request<Timeline>(`/books/${id}/timeline`);

/** Position save; `read` = words consumed since the last report (stats),
 *  `day` = the client's LOCAL date (streaks are a human-day concept). */
export const savePosition = (
  id: string,
  position: number,
  read?: number,
  day?: string,
): Promise<void> =>
  request<void>(
    `/books/${id}/position`,
    json(read && read > 0 ? { position, read, day } : { position }, 'PUT'),
  );

export const deleteBook = (id: string): Promise<void> =>
  request<void>(`/books/${id}`, { method: 'DELETE' });

// ---------- catalog ----------

export const catalog = (): Promise<CatalogEntry[]> => request<CatalogEntry[]>('/catalog');

/** 409 = already in the library (idempotent per user); callers catch it. */
export const catalogAdd = (slug: string): Promise<Book> =>
  request<Book>(`/catalog/${slug}/add`, { method: 'POST' });

// ---------- stats ----------

export const stats = (): Promise<Stats> => request<Stats>('/stats');

export const sessions = (limit = 50): Promise<ReadingSession[]> =>
  request<ReadingSession[]>(`/sessions?limit=${limit}`);

export const createSession = (
  s: Omit<ReadingSession, 'id' | 'book_title'>,
): Promise<ReadingSession> => request<ReadingSession>('/sessions', json(s));

/** The client's local calendar date as YYYY-MM-DD (for streak reporting). */
export function localDay(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
