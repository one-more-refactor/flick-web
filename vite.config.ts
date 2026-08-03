import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  base: '/app/',
  build: { outDir: 'dist/app' },
  plugins: [svelte()],
  server: {
    proxy: {
      '/api': 'http://localhost:8484',
    },
  },
});
