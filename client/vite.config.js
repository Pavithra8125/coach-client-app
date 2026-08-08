import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // During development, forward API calls to the Express server so the
    // frontend can fetch from a same-origin `/api` path.
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
});
