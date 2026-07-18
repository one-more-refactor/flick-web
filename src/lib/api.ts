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

/** Weekly upload allowance; `limit: null` = unlimited (selfhost or pro). */
export interface UploadStatus {
  used: number;
  limit: number | null;
}

export interface User {
  id: string;
  email: string | null; // null for guests
  name: string;
  username: string | null;
  guest: boolean;
  onboarded: boolean;
  /** "free" | "pro" (v0.6). */
  plan?: string;
  /** Effective Pro right now (plan, credit time, or free_pro event). */
  pro_active?: boolean;
  /** Remaining credit-based Pro days. */
  pro_days?: number;
  settings: Settings;
  /** Present from server v0.4 on. */
  uploads?: UploadStatus;
}

export interface Meta {
  edition: 'selfhost' | 'hosted';
  version: string;
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
  /** User tags (auto-seeded from the category at creation, v0.4.3). */
  tags: string[];
}

/** A book sitting in the trash bin (contract v0.4.3). */
export interface TrashItem {
  id: string;
  title: string;
  author: string | null;
  word_count: number;
  deleted_at: number;
  expires_at: number;
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
  /** Lifetime aggregates (v0.4.2); absent on pre-v0.4.2 servers. */
  totals?: {
    time_ms: number;
    sessions: number;
    avg_wpm: number;
    books_finished: number;
    active_days: number;
    best_day: { day: string; words: number } | null;
  };
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
  /** Machine-readable error code when the server sends one (e.g. "upload_limit"). */
  code: string | null;
  /** Existing book id on a 409 catalog add (libraries are pre-seeded, contract v0.4.1). */
  bookId: string | null;
  constructor(status: number, message: string, code: string | null = null, bookId: string | null = null) {
    super(message);
    this.status = status;
    this.code = code;
    this.bookId = bookId;
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
    let code: string | null = null;
    let bookId: string | null = null;
    try {
      const body: unknown = await res.json();
      if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') {
        message = body.error;
      }
      if (body && typeof body === 'object' && 'code' in body && typeof body.code === 'string') {
        code = body.code;
      }
      if (body && typeof body === 'object' && 'book_id' in body && typeof body.book_id === 'string') {
        bookId = body.book_id;
      }
    } catch {
      // body was not JSON — keep the status line
    }
    throw new ApiError(res.status, message, code, bookId);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

const json = (body: unknown, method = 'POST'): RequestInit => ({
  method,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

/** Public server metadata — the client switches Pro/Contribute on `edition`. */
export const meta = (): Promise<Meta> => request<Meta>('/meta');

// ---------- auth ----------

export const guest = (ref?: string): Promise<User> =>
  request<User>('/auth/guest', ref ? json({ ref }) : { method: 'POST' });

export const lookup = (email: string): Promise<Lookup> =>
  request<Lookup>('/auth/lookup', json({ email }));

export const register = (
  email: string,
  password: string,
  name?: string,
  ref?: string,
): Promise<User> =>
  request<User>(
    '/auth/register',
    json({ email, password, ...(name ? { name } : {}), ...(ref ? { ref } : {}) }),
  );

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

/** Soft delete: the book moves to the trash (restorable ~30 days). */
export const deleteBook = (id: string): Promise<void> =>
  request<void>(`/books/${id}`, { method: 'DELETE' });

export const trash = (): Promise<{ items: TrashItem[]; retention_days: number }> =>
  request<{ items: TrashItem[]; retention_days: number }>('/books/trash');

export const restoreBook = (id: string): Promise<void> =>
  request<void>(`/books/${id}/restore`, { method: 'POST' });

export const purgeBook = (id: string): Promise<void> =>
  request<void>(`/books/${id}/purge`, { method: 'DELETE' });

export const setTags = (id: string, tags: string[]): Promise<Book> =>
  request<Book>(`/books/${id}/tags`, json({ tags }, 'PUT'));

// ---------- share links (v0.6) ----------

export const shareBook = (id: string): Promise<{ token: string; path: string }> =>
  request<{ token: string; path: string }>(`/books/${id}/share`, { method: 'POST' });

export const unshareBook = (id: string): Promise<void> =>
  request<void>(`/books/${id}/share`, { method: 'DELETE' });

export interface SharedInfo {
  title: string;
  author: string | null;
  word_count: number;
  category: string | null;
}

export const sharedInfo = (token: string): Promise<SharedInfo> =>
  request<SharedInfo>(`/shared/${token}`);

export const sharedImport = (token: string): Promise<Book> =>
  request<Book>(`/shared/${token}/import`, { method: 'POST' });

/** Rewrite a public Dropbox / Google Drive / OneDrive share link into a
 *  direct-download URL for POST /api/import/url. Returns null when the link
 *  is not a recognized cloud share. (Contract v0.4.3 — no OAuth, no keys.) */
export function cloudDirectUrl(link: string): string | null {
  let u: URL;
  try {
    u = new URL(link.trim());
  } catch {
    return null;
  }
  const host = u.hostname.toLowerCase();
  if (host === 'www.dropbox.com' || host === 'dropbox.com') {
    u.searchParams.set('dl', '1');
    return u.toString();
  }
  if (host === 'drive.google.com') {
    const m = u.pathname.match(/\/file\/d\/([^/]+)/);
    const fileId = m?.[1] ?? u.searchParams.get('id');
    return fileId
      ? `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`
      : null;
  }
  if (host === '1drv.ms' || host.endsWith('.sharepoint.com') || host === 'onedrive.live.com') {
    // OneDrive share-URL → direct content via the shares API (base64url token).
    const token = btoa(u.toString()).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return `https://api.onedrive.com/v1.0/shares/u!${token}/root/content`;
  }
  return null;
}

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

// ---------- referrals, events, social (v0.7) ----------

export interface ReferralStatus {
  code: string;
  path: string;
  invited: number;
  pending: number;
  qualified: number;
  reward_days: number;
  qualify_days: number;
  event: { title: string; ends_at: number } | null;
}

export const referral = (): Promise<ReferralStatus> => request<ReferralStatus>('/referral');

export interface ActiveEvent {
  kind: string;
  title: string;
  ends_at: number;
}

export const activeEvents = (): Promise<ActiveEvent[]> =>
  request<ActiveEvent[]>('/events/active');

export interface FriendRow {
  id: string;
  name: string;
  me: boolean;
  week_words: number;
  total_words: number;
  today_words: number;
  streak: number;
  best_streak: number;
}

export const friends = (): Promise<FriendRow[]> => request<FriendRow[]>('/friends');

export const friendLink = (): Promise<{ code: string; path: string }> =>
  request<{ code: string; path: string }>('/friends/link');

export const friendAdd = (code: string): Promise<void> =>
  request<void>('/friends/add', json({ code }));

export const friendRemove = (id: string): Promise<void> =>
  request<void>(`/friends/${id}`, { method: 'DELETE' });

export interface Wrapped {
  year: number;
  total_words: number;
  active_days: number;
  best_day: { day: string; words: number } | null;
  best_streak: number;
  top_month: number | null;
  top_weekday: number | null;
  sessions: number;
  time_ms: number;
  avg_wpm: number;
  books_finished: number;
}

export const wrapped = (year?: number): Promise<Wrapped> =>
  request<Wrapped>(year ? `/wrapped?year=${year}` : '/wrapped');
