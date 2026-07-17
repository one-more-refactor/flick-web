// flick web — typed API client. The shape of everything here is bound by
// docs/CONTRACTS.md; change that file first, this one second.

export type Theme = 'auto' | 'light' | 'dark';

export interface Settings {
  wpm: number;
  theme: Theme;
}

export interface User {
  id: string;
  email: string;
  name: string;
  username: string | null;
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
  source: 'paste' | 'pdf' | 'intro';
  word_count: number;
  position: number;
  /** Unix timestamp in seconds (as served by flick-server). */
  created_at: number;
}

/** `[text, orp_index, weight]` — array-of-arrays keeps payloads small. */
export type TimelineWord = [string, number, number];

export interface Timeline {
  version: number;
  words: TimelineWord[];
  word_count: number;
}

export interface OidcProvider {
  enabled: boolean;
  name: string;
}

export interface Providers {
  oidc: OidcProvider;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

let onUnauthorized: (() => void) | null = null;

/** Called whenever a non-auth endpoint answers 401 (session gone) — the app drops to AUTH. */
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

export const register = (email: string, password: string, name: string): Promise<User> =>
  request<User>('/auth/register', json({ email, password, name }));

export const login = (email: string, password: string): Promise<User> =>
  request<User>('/auth/login', json({ email, password }));

export const logout = (): Promise<void> => request<void>('/auth/logout', { method: 'POST' });

export const me = (): Promise<User> => request<User>('/auth/me');

export const updateMe = (patch: UserPatch): Promise<User> =>
  request<User>('/auth/me', json(patch, 'PATCH'));

export const providers = (): Promise<Providers> => request<Providers>('/auth/providers');

/** SSO entry point — a 302 to the IdP, so navigate to it (never fetch it). */
export const oidcLoginUrl = '/api/auth/oidc/login';

// ---------- books ----------

export const books = (): Promise<Book[]> => request<Book[]>('/books');

export const book = (id: string): Promise<Book> => request<Book>(`/books/${id}`);

export const createBookFromText = (text: string, title?: string): Promise<Book> =>
  request<Book>('/books', json(title ? { title, text } : { text }));

export const createBookFromPdf = (file: File, title?: string): Promise<Book> => {
  const form = new FormData();
  form.append('file', file);
  if (title) form.append('title', title);
  return request<Book>('/books', { method: 'POST', body: form });
};

export const timeline = (id: string): Promise<Timeline> =>
  request<Timeline>(`/books/${id}/timeline`);

export const savePosition = (id: string, position: number): Promise<void> =>
  request<void>(`/books/${id}/position`, json({ position }, 'PUT'));

export const deleteBook = (id: string): Promise<void> =>
  request<void>(`/books/${id}`, { method: 'DELETE' });
