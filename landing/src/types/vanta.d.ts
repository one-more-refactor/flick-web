/* Vanta ships no types — declare the dist entrypoints we may lazy-load.
   Each exports a factory that mounts an effect into `el` and returns a handle
   with `destroy()` (and `setOptions()` on most effects). */

interface VantaEffect {
  destroy: () => void;
  setOptions?: (options: Record<string, unknown>) => void;
}

declare module 'vanta/dist/vanta.dots.min' {
  const factory: (options: Record<string, unknown>) => VantaEffect;
  export default factory;
}

declare module 'vanta/dist/vanta.net.min' {
  const factory: (options: Record<string, unknown>) => VantaEffect;
  export default factory;
}
