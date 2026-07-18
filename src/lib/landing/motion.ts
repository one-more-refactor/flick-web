// Landing scroll reveals — IntersectionObserver + the Web Animations API, no
// third-party animation library. GSAP is deliberately NOT used here: its
// license (GreenSock "no-charge") is not GPL-compatible and this file ships
// inside the AGPL app's web/dist. The fancy marketing motion (GSAP/Lenis/Vanta)
// lives in the separate, non-AGPL flick-landing site instead.
//
// Dynamically imported by Landing.svelte AFTER first paint and ONLY when
// prefers-reduced-motion is off, so it stays off the critical path. Without it
// the landing is fully static and fully usable — motion is decoration here,
// never load-bearing (if this never runs, content simply stays visible).
//
// Motion law (docs/DESIGN-BRIEF-v0.3.md): nothing over 600ms per beat, easing
// linear/ease-in-out only, enters = fade + 4–8px translate (never scale),
// short staggers on grouped items, each band reveals once and then sits still.

const EASE = 'cubic-bezier(0.2, 0.6, 0.2, 1)';

/** Wire the landing's scroll reveals. Returns a full-teardown cleanup —
 *  Landing unmounts on login/start, and nothing may leak into the app. */
export function mountLandingMotion(root: HTMLElement): () => void {
  const io = new IntersectionObserver(
    (entries, obs) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        reveal(e.target as HTMLElement);
        obs.unobserve(e.target);
      }
    },
    { rootMargin: '0px 0px -18% 0px', threshold: 0.12 },
  );

  // Set start states in JS (not CSS) so a band is hidden only once this module
  // is actually running; a never-loaded / reduced-motion chunk leaves content
  // visible. A band already on screen still animates when observed on mount.
  for (const band of Array.from(root.querySelectorAll<HTMLElement>('[data-lp-band]'))) {
    for (const el of Array.from(
      band.querySelectorAll<HTMLElement>('[data-lp-reveal],[data-lp-row]'),
    )) {
      el.style.opacity = '0';
    }
    const bar = band.querySelector<HTMLElement>('[data-lp-bar]');
    if (bar) {
      bar.style.transformOrigin = 'left center';
      bar.style.transform = 'scaleX(0)';
    }
    io.observe(band);
  }

  function reveal(band: HTMLElement): void {
    const items = Array.from(band.querySelectorAll<HTMLElement>('[data-lp-reveal]'));
    items.forEach((el, i) => {
      el.style.opacity = '';
      el.animate(
        [
          { opacity: 0, transform: 'translateY(8px)' },
          { opacity: 1, transform: 'none' },
        ],
        { duration: 380, delay: i * 60, easing: EASE, fill: 'backwards' },
      );
    });
    // the ORP column prints row by row, like a receipt
    const rows = Array.from(band.querySelectorAll<HTMLElement>('[data-lp-row]'));
    rows.forEach((el, i) => {
      el.style.opacity = '';
      el.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 180,
        delay: 200 + i * 70,
        easing: 'linear',
        fill: 'backwards',
      });
    });
    // the pace bar sweeps once — 500ms linear
    const bar = band.querySelector<HTMLElement>('[data-lp-bar]');
    if (bar) {
      bar.style.transform = '';
      bar.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], {
        duration: 500,
        delay: 250,
        easing: 'linear',
        fill: 'backwards',
      });
    }
  }

  return () => io.disconnect();
}
