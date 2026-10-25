import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/',
  plugins: [react()],
  build: {
    // The only chunk above Vite's 500 kB default is the lazily loaded, idle-deferred Three.js
    // crystal scene (~136 kB gzip, essentially WebGLRenderer); it never blocks the lead form.
    chunkSizeWarningLimit: 600,
  },
});
