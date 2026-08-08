// Per-view document metadata: title, description, canonical, and whether the
// view should be indexed at all.
//
// The app is one HTML document for every route, so none of this can be static.
// Two things make it matter: the public pages (landing, /science, the legal
// pages, /premium) are what search and answer engines see, and the private
// ones (a library, a reader, someone's stats) must never end up in an index
// because a link was shared.

/** The canonical marketing origin. `app.*` serves the same pages. */
const CANONICAL_ORIGIN = 'https://myflick.app';

/** Hosts that are the hosted deployment rather than someone's own server. */
const HOSTED = new Set(['myflick.app', 'app.myflick.app']);

export type SeoView =
  | 'landing'
  | 'science'
  | 'impressum'
  | 'datenschutz'
  | 'premium'
  | 'private';

type Meta = { title: string; description: string; index: boolean };

const DESCRIPTION =
  'Open-source speed reading. One word at a time, anchored on the pivot letter ' +
  'your eye locks onto. Import PDFs, EPUBs, articles and Kindle clippings — ' +
  'read as a guest with no account, or self-host it in one command.';

/**
 * Canonical URL for a path. On the hosted deployment both `myflick.app` and
 * `app.myflick.app` serve these pages, so they canonicalise to the apex. A
 * self-hosted instance canonicalises to itself — pointing someone's private
 * server at our domain would be wrong and would leak nothing but confusion.
 */
function canonicalFor(path: string): string {
  const origin = HOSTED.has(location.hostname) ? CANONICAL_ORIGIN : location.origin;
  return `${origin}${path}`;
}

function upsertMeta(selector: string, create: () => HTMLMetaElement, content: string): void {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  el.content = content;
}

function named(name: string): () => HTMLMetaElement {
  return () => {
    const el = document.createElement('meta');
    el.name = name;
    return el;
  };
}

function property(prop: string): () => HTMLMetaElement {
  return () => {
    const el = document.createElement('meta');
    el.setAttribute('property', prop);
    return el;
  };
}

function setCanonical(href: string): void {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'canonical';
    document.head.appendChild(link);
  }
  link.href = href;
}

function metaFor(view: SeoView, bookTitle: string | null, contribute: boolean): Meta {
  switch (view) {
    case 'science':
      return {
        title: 'Does speed reading work? — flick',
        description:
          'RSVP removes eye movement, not attention. What the research supports, what ' +
          'it does not, the strongest argument against speed reading, and what wpm to ' +
          'actually use — with citations.',
        index: true,
      };
    case 'premium':
      return {
        title: contribute ? 'contribute — flick' : 'premium — flick',
        description: contribute
          ? 'flick is AGPL-3.0 and free to self-host. How to support the project.'
          : 'flick Pro: an unlimited shelf and cloud imports. What is free stays free.',
        index: true,
      };
    case 'impressum':
      return { title: 'Impressum — flick', description: 'Anbieterkennzeichnung.', index: true };
    case 'datenschutz':
      return {
        title: 'Datenschutzerklärung — flick',
        description: 'Wie flick mit personenbezogenen Daten umgeht (Art. 13 DSGVO).',
        index: true,
      };
    case 'private':
      return {
        title: bookTitle ? `${bookTitle} — flick` : 'flick',
        description: DESCRIPTION,
        index: false,
      };
    default:
      return { title: 'flick — read it in a flick', description: DESCRIPTION, index: true };
  }
}

/**
 * Apply the metadata for the current view. Called from the App state machine
 * whenever the view changes, after the URL has been pushed — canonical must
 * describe the path the visitor is actually on.
 */
export function applySeo(
  view: SeoView,
  opts: { title?: string; bookTitle?: string | null; contribute?: boolean } = {},
): void {
  const meta = metaFor(view, opts.bookTitle ?? null, opts.contribute ?? false);
  const title = opts.title ?? meta.title;

  document.title = title;
  upsertMeta('meta[name="description"]', named('description'), meta.description);
  upsertMeta(
    'meta[name="robots"]',
    named('robots'),
    meta.index ? 'index, follow, max-image-preview:large, max-snippet:-1' : 'noindex, nofollow',
  );

  // Open Graph mirrors the same pair so shared links preview correctly.
  upsertMeta('meta[property="og:title"]', property('og:title'), title);
  upsertMeta('meta[property="og:description"]', property('og:description'), meta.description);

  const canonical = canonicalFor(location.pathname);
  upsertMeta('meta[property="og:url"]', property('og:url'), canonical);
  // Private views get no canonical at all: there is nothing to consolidate,
  // and naming the URL is the opposite of what `noindex` is asking for.
  if (meta.index) {
    setCanonical(canonical);
  } else {
    document.head.querySelector('link[rel="canonical"]')?.remove();
  }
}
