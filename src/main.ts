import { mount } from 'svelte';
import './app.css';
import App from './App.svelte';

const app = mount(App, { target: document.getElementById('app')! });

// PWA: optional service worker (production only, never in dev). The app
// works identically when this never runs — the SW is pure progressive polish.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // registration failure is fine — the app does not depend on the SW
    });
  });
}

export default app;
