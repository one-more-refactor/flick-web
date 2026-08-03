# Performance Audit

Audit date: 2026-07-18

## Scope

This audit covers the Astro marketing site, including static output, critical-path HTML and CSS, dynamically loaded motion libraries, Vanta/Three.js rendering, GSAP/Lenis/anime.js choreography, reader demos, responsive and reduced-motion gates, and browser lifecycle cleanup.

Measurements were taken from a clean local `bun run check && bun run build`. Source candidates were confirmed through build output and lifecycle inspection before fixes were applied.

## Executive summary

The static foundation is efficient: one 28 KB HTML page, 20 KB CSS, no framework hydration, and motion libraries loaded through dynamic imports. The primary performance cost is optional visual motion rather than content delivery.

Two confirmed lifecycle findings were fixed:

| ID | Severity | Finding | Location | Status |
|---|---|---|---|---|
| P-01 | Medium | Reader demos continued animation work after page lifecycle exit | `src/components/HeroReader.astro` | Fixed and verified |
| P-02 | Medium | Deferred Vanta loading could recreate WebGL after teardown | `src/components/VantaBg.astro` | Fixed and verified |

The remaining major cost is intentional: Vanta loads a 734.45 KB minified Three.js chunk, 188.36 KB compressed, after page load and idle time on desktop devices. It is excluded on narrow screens, reduced-motion clients, and data-saver connections.

## Baseline build

```text
HTML                         28 KB
CSS                          20 KB
Site motion controller      4.45 KB, 1.68 KB gzip
Vanta controller            1.70 KB, 1.00 KB gzip
Vanta DOTS                  11.05 KB, 3.87 KB gzip
Lenis                       18.42 KB, 5.34 KB gzip
ScrollTrigger               43.99 KB, 18.20 KB gzip
GSAP/anime chunks           70.85 KB + 125.51 KB
Three.js                   734.45 KB, 188.36 KB gzip
Total dist                   1.2 MB
```

## Findings

### P-01: Reader demos continued animation work after page lifecycle exit

**Severity:** Medium

Each normal-motion reader started a perpetual `requestAnimationFrame` chain. Reduced-motion readers started a perpetual interval. The wait variant also retained a fallback timeout and event listener until startup. None of these resources were cancelled on `pagehide`, so page replacement or Astro-style navigation could leave detached demo loops consuming CPU and retaining DOM references.

#### Fix

- Track each interval and animation-frame ID.
- Clear the wait fallback and remove its listener as soon as startup succeeds.
- Register one page lifecycle cleanup that stops every reader controller.
- Prevent delayed startup after cleanup.

#### Verification

`bun run check && bun run build` passes. The generated site retains the same reader behavior and output while every interval, timeout, event listener, and frame chain now has an explicit stop path.

Verified.

### P-02: Deferred Vanta loading could recreate WebGL after teardown

**Severity:** Medium

Vanta is intentionally loaded after `load` and an idle callback. If `pagehide` occurred while the large Three.js/Vanta imports were in flight, teardown saw no active effect. The asynchronous build then resumed and created a WebGL scene after lifecycle exit. The theme observer and media-query listener also remained active after teardown.

#### Fix

- Add a persistent stopped state checked before loading and immediately before effect creation.
- Disconnect the theme observer and reduced-motion listener during lifecycle cleanup.
- Cancel pending theme-retint work.
- Prevent idle or asynchronous continuations from rebuilding the scene.

#### Verification

`bun run check && bun run build` passes. Vanta remains lazy, data-saver aware, desktop-only, and reduced-motion aware, but can no longer instantiate after the page has stopped.

Verified.

## Confirmed costs retained by design

### Three.js dominates optional transfer

`three.module` is 734.45 KB minified and 188.36 KB gzip, substantially larger than the rest of the page. It is not on the initial parser-critical path: `VantaBg` waits for page load, then idle time, and skips screens under 760 px, reduced-motion users, and data-saver users. This is an explicit design/performance tradeoff rather than an accidental critical-path regression.

A future reduction would require replacing Vanta with a lightweight Canvas/CSS implementation or accepting a static background. Manual chunking would change file boundaries but not bytes downloaded.

### Motion stack carries three overlapping libraries

GSAP/ScrollTrigger, Lenis, and anime.js are loaded together for eligible visitors. They provide distinct choreography, smooth scrolling, and micro-animation roles, but increase parse/compile cost and maintain a continuous ticker while the page is active. Consolidating micro-interactions into GSAP could remove anime.js; removing Lenis would eliminate a permanent scroll ticker. These are visual-direction decisions and were not changed during a surgical audit.

### Vanta rebuilds on theme changes

Theme changes destroy and recreate the WebGL effect so token colors update. This is expensive but debounced and user-triggered. It is not part of ordinary scrolling or initial content rendering.

## Ruled-out items

- The page is statically generated and ships no framework hydration runtime.
- Motion-hidden elements are gated by `html[data-motion]`; the attribute is not set under reduced motion and is removed if lazy imports fail, so content does not remain hidden indefinitely.
- Vanta is excluded on phones, reduced-motion clients, and data-saver connections.
- Reader frame accumulation clamps background-tab elapsed time to 250 ms, preventing a burst through the timeline on resume.
- Reader DOM updates are small and direct; no reactive framework rerender occurs per word.
- The Open Graph image is only 60 KB and is not referenced as visible page content.
- The 20 KB CSS output and 28 KB HTML output are not material bottlenecks.

## Recommendations

1. Treat the 188.36 KB compressed Three.js payload as a performance budget exception and track it in CI.
2. Consider replacing Vanta with a small custom Canvas effect if mobile-class desktop devices become a priority.
3. Evaluate whether Lenis materially improves conversion; removing it would eliminate a continuous ticker and one 5.34 KB compressed chunk.
4. Consider implementing micro-interactions in GSAP and dropping anime.js to reduce duplicate animation machinery.
5. Add browser performance tests that assert no reader or WebGL work continues after `pagehide`.

## Verification

```text
bun run check
bun run build
```

Both pass with zero diagnostics. The build continues to report only the known Three.js chunk-size warning.
