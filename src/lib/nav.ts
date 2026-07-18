// Minimal History-API routing (CONTRACTS v0.4: real URLs, working back
// button). The state machine in App.svelte stays the source of truth; this
// module only translates view ⇄ path and owns pushState/popstate.

export type Route =
  | { name: 'home' } // landing (logged out) or library (authed)
  | { name: 'read'; id: string }
  | { name: 'stats' }
  | { name: 'auth' }
  | { name: 'premium' };

export function parsePath(pathname: string): Route {
  const read = pathname.match(/^\/read\/([A-Za-z0-9]+)$/);
  if (read) return { name: 'read', id: read[1] };
  if (pathname === '/stats') return { name: 'stats' };
  if (pathname === '/auth') return { name: 'auth' };
  if (pathname === '/premium') return { name: 'premium' };
  return { name: 'home' };
}

export function pathFor(route: Route): string {
  switch (route.name) {
    case 'read':
      return `/read/${route.id}`;
    case 'stats':
      return '/stats';
    case 'auth':
      return '/auth';
    case 'premium':
      return '/premium';
    default:
      return '/';
  }
}

/** Push a route onto history unless we are already there. */
export function push(route: Route): void {
  const path = pathFor(route);
  if (location.pathname !== path) history.pushState({}, '', path);
}

/** Replace the current entry (used when a view is entered non-interactively). */
export function replace(route: Route): void {
  history.replaceState({}, '', pathFor(route));
}

export function onPop(handler: (route: Route) => void): void {
  window.addEventListener('popstate', () => handler(parsePath(location.pathname)));
}
