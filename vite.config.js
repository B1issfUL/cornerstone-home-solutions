import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/cornerstone-home-solutions/',
  plugins: [react()],
});
