// @ts-check
import { defineConfig } from 'astro/config';

// Static marketing site for the hosted flick service. The app itself lives in
// the flick repo (Rust + Svelte); this is only the front door for logged-out
// visitors at myflick.app. `site` is used for canonical URLs / sitemap.
export default defineConfig({
  site: 'https://myflick.app',
  // Everything is prerendered to static HTML; the interactive bits (hero
  // reader, scroll motion, ambient background) are client-side islands.
  output: 'static',
  build: { inlineStylesheets: 'auto' },
});
