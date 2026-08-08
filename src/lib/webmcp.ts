// WebMCP (https://webmachinelearning.github.io/webmcp/): expose the app's own
// actions to a browser-side agent through `navigator.modelContext`.
//
// The tools here are deliberately the ones the HTTP API *cannot* do from
// outside: opening a book in this reader, changing the speed of the running
// stream. The read-only ones are included because an agent that can act needs
// to be able to look first — but note it is already signed in as this user, in
// this tab, so nothing here grants access the person at the keyboard does not
// already have.
//
// Feature-detected throughout: no browser ships this by default yet, so the
// whole module is a no-op where `navigator.modelContext` is absent.

import * as api from './api';

/** The slice of the WebMCP draft we use. Typed locally — no shipped lib.dom. */
interface WebMcpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (args: Record<string, unknown>) => Promise<{ content: { type: 'text'; text: string }[] }>;
}

interface ModelContext {
  provideContext(context: { tools: WebMcpTool[] }): void | Promise<void>;
}

function modelContext(): ModelContext | null {
  const mc = (navigator as Navigator & { modelContext?: ModelContext }).modelContext;
  return mc && typeof mc.provideContext === 'function' ? mc : null;
}

export interface WebMcpHandlers {
  /** Open a book in the reader and route to it, as a click would. */
  openBook: (id: string) => Promise<void>;
  /** Apply a new words-per-minute setting to the running reader. */
  setWpm: (wpm: number) => void;
  /** The current words-per-minute setting. */
  currentWpm: () => number;
  /** Whether anyone is signed in yet (guests count). */
  signedIn: () => boolean;
}

const text = (body: unknown) => ({
  content: [
    {
      type: 'text' as const,
      text: typeof body === 'string' ? body : JSON.stringify(body, null, 2),
    },
  ],
});

/** Turn a thrown API error into something the model can act on. */
function failure(e: unknown): { content: { type: 'text'; text: string }[] } {
  const message = e instanceof Error ? e.message : String(e);
  return text(`That didn't work: ${message}`);
}

function requireNumber(args: Record<string, unknown>, key: string): number | null {
  const value = args[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function requireString(args: Record<string, unknown>, key: string): string | null {
  const value = args[key];
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

function tools(handlers: WebMcpHandlers): WebMcpTool[] {
  const needsSession = 'Nobody is signed in on this page yet. Open a book or start reading first.';

  return [
    {
      name: 'search_library',
      description:
        "Search the reader's own flick library by title and contents, or list all of it. " +
        'Returns book ids, titles, word counts and how far through each one they are.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Words to search for. Omit to list everything.' },
        },
      },
      async execute(args) {
        if (!handlers.signedIn()) return text(needsSession);
        try {
          const books = await api.books(requireString(args, 'query') ?? undefined);
          return text(
            books.map((b) => ({
              id: b.id,
              title: b.title,
              author: b.author,
              source: b.source,
              word_count: b.word_count,
              position: b.position,
              percent_read: b.word_count ? Math.round((b.position / b.word_count) * 100) : 0,
            })),
          );
        } catch (e) {
          return failure(e);
        }
      },
    },
    {
      name: 'open_book',
      description:
        'Open one of the reader\'s books in the flick reader on this page and start it from ' +
        'where they left off. This is the tool that actually makes them read something — ' +
        'get an id from search_library or add_catalog_book first.',
      inputSchema: {
        type: 'object',
        properties: {
          book_id: { type: 'string', description: 'Book id from search_library.' },
        },
        required: ['book_id'],
      },
      async execute(args) {
        const id = requireString(args, 'book_id');
        if (!id) return text('open_book needs a book_id.');
        try {
          await handlers.openBook(id);
          return text(`Opened ${id} in the reader.`);
        } catch (e) {
          return failure(e);
        }
      },
    },
    {
      name: 'set_reading_speed',
      description:
        'Change the reading speed of the reader on this page, in words per minute. Takes ' +
        'effect on the next word. 400–500 is where most practised readers settle; ' +
        'comprehension degrades as the rate climbs, so do not push someone past 800 for ' +
        'anything they need to retain.',
      inputSchema: {
        type: 'object',
        properties: {
          wpm: { type: 'integer', minimum: 100, maximum: 1200 },
        },
        required: ['wpm'],
      },
      async execute(args) {
        const wpm = requireNumber(args, 'wpm');
        if (wpm === null) return text('set_reading_speed needs a numeric wpm.');
        const clamped = Math.round(Math.min(1200, Math.max(100, wpm)));
        handlers.setWpm(clamped);
        return text(
          clamped === Math.round(wpm)
            ? `Reading speed is now ${clamped} wpm.`
            : `Reading speed is now ${clamped} wpm (${Math.round(wpm)} is outside the 100–1200 range).`,
        );
      },
    },
    {
      name: 'save_to_library',
      description:
        "Add something to the reader's flick library so they can speed-read it: either a " +
        'public URL (the article is fetched and extracted) or text you already have.',
      inputSchema: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'A public http(s) URL to import.' },
          text: { type: 'string', description: 'Text to save instead of a URL.' },
          title: { type: 'string', description: 'Optional title.' },
        },
      },
      async execute(args) {
        if (!handlers.signedIn()) return text(needsSession);
        const url = requireString(args, 'url');
        const body = requireString(args, 'text');
        if (!url && !body) return text('save_to_library needs either a url or some text.');
        try {
          const title = requireString(args, 'title') ?? undefined;
          const book = url
            ? await api.importUrl(url, title)
            : await api.createBookFromText(body as string, title);
          return text({
            saved: { id: book.id, title: book.title, word_count: book.word_count },
            hint: 'Call open_book with this id to start reading it.',
          });
        } catch (e) {
          return failure(e);
        }
      },
    },
    {
      name: 'list_catalog',
      description:
        'The public-domain works shipped with flick — free to read, already in every ' +
        "reader's library. Useful when someone wants something to read and has nothing " +
        'particular in mind.',
      inputSchema: { type: 'object', properties: {} },
      async execute() {
        try {
          return text(await api.catalog());
        } catch (e) {
          return failure(e);
        }
      },
    },
    {
      name: 'reading_stats',
      description:
        "The reader's words read today, all-time total, daily goal and streak. Use it " +
        'before suggesting a session — someone three words short of their goal is worth ' +
        'telling.',
      inputSchema: { type: 'object', properties: {} },
      async execute() {
        if (!handlers.signedIn()) return text(needsSession);
        try {
          const s = await api.stats();
          return text({
            today: s.today,
            goal: s.goal,
            total_words: s.total_words,
            streak: s.streak,
            current_wpm: handlers.currentWpm(),
          });
        } catch (e) {
          return failure(e);
        }
      },
    },
  ];
}

/**
 * Publish the tool set to the page's model context. Safe to call on a browser
 * without WebMCP, and safe to call again — `provideContext` replaces the
 * previous declaration rather than appending to it.
 */
export function provideWebMcpTools(handlers: WebMcpHandlers): void {
  const mc = modelContext();
  if (!mc) return;
  try {
    void mc.provideContext({ tools: tools(handlers) });
  } catch {
    // An origin can have the API present but context provision refused; a
    // page that cannot advertise tools must still be a working reader.
  }
}
