// Landing scroll choreography — GSAP ScrollTrigger reveals + Lenis smoothing.
// This module is dynamically imported by Landing.svelte AFTER first paint and
// ONLY when prefers-reduced-motion is off, so gsap/lenis live in a lazy chunk
// and never touch the critical path. Without it the landing is fully static
// and fully usable — motion is decoration here, never load-bearing.
//
// Motion law (docs/DESIGN-BRIEF-v0.3.md): nothing over 600ms per beat, easing
// only linear/ease-in-out, enters = fade + 4–8px translate (never scale),
// short staggers on grouped items. `once: true` everywhere — a band reveals
// one time and then sits still, like an instrument that has settled.

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

/** Wire the landing's scroll choreography. Returns a full-teardown cleanup —
 *  Landing unmounts on login/start, and nothing may leak into the app. */
export function mountLandingMotion(root: HTMLElement): () => void {
  // Premium-feel smooth scroll. Restrained lerp; Lenis leaves touch alone by
  // default (instrument-direct on phones). Runs on the GSAP ticker so both
  // systems share one rAF.
  const lenis = new Lenis({ lerp: 0.14 });
  lenis.on('scroll', ScrollTrigger.update);
  const tick = (time: number) => lenis.raf(time * 1000);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);

  const ctx = gsap.context(() => {
    for (const band of Array.from(root.querySelectorAll<HTMLElement>('[data-lp-band]'))) {
      const items = band.querySelectorAll<HTMLElement>('[data-lp-reveal]');
      const rows = band.querySelectorAll<HTMLElement>('[data-lp-row]');
      const bar = band.querySelector<HTMLElement>('[data-lp-bar]');

      // Set start states explicitly (not via CSS) so a failed chunk load can
      // never leave content hidden, and there is no from()-tween pop.
      if (items.length) gsap.set(items, { autoAlpha: 0, y: 8 });
      if (rows.length) gsap.set(rows, { autoAlpha: 0 });
      if (bar) gsap.set(bar, { scaleX: 0, transformOrigin: 'left center' });

      // A band already inside the first viewport plays as part of the load
      // beat (short delay after the hero); everything below waits for scroll.
      const inView = band.getBoundingClientRect().top < window.innerHeight * 0.8;
      const tl = gsap.timeline(
        inView
          ? { delay: 0.3 }
          : { scrollTrigger: { trigger: band, start: 'top 80%', once: true } },
      );
      if (items.length)
        tl.to(items, { autoAlpha: 1, y: 0, duration: 0.38, ease: 'power1.inOut', stagger: 0.06 });
      // the ORP column prints row by row, like a receipt
      if (rows.length)
        tl.to(rows, { autoAlpha: 1, duration: 0.18, ease: 'none', stagger: 0.07 }, '-=0.12');
      // the pace bar sweeps once — 500ms linear, per the streak choreography
      if (bar) tl.to(bar, { scaleX: 1, duration: 0.5, ease: 'none' }, '-=0.05');
    }
  }, root);

  return () => {
    ctx.revert();
    gsap.ticker.remove(tick);
    lenis.destroy();
  };
}
