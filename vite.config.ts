import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Atelier Inventory',
        short_name: 'Atelier',
        description: 'Inventory, photo capture and movement tracking for a wedding dress atelier.',
        // The industrial palette: neutral slate, no pink splash screen.
        theme_color: '#f1f5f9',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // The in-browser background remover is ~860 KB of onnxruntime that only
        // the owner ever uses, and the spreadsheet writer is ~420 KB that only
        // runs when someone exports. Both are fetched on demand like their
        // 23 MB wasm companion, so neither may be precached on every staff
        // install.
        // The spreadsheet writer and the background-removal engine are large
        // and belong to features only the owner uses. They are loaded on
        // demand and are not worth precaching for every member of staff.
        globIgnores: ['**/ort*.{js,mjs}', '**/dist-*.js', '**/xlsx-*.js', '**/exceljs*.js'],
        runtimeCaching: [
          {
            // Only the public share reader is cached. Authenticated API
            // responses must never be: the cache key is the URL, and
            // PostgREST answers the same URL for every signed-in user, so on
            // a shared tablet one staff member could be served another
            // member's dresses and customer rows.
            urlPattern: /\/rest\/v1\/rpc\/get_shared_dresses/i,
            handler: 'NetworkFirst',
            options: { cacheName: 'public-share', expiration: { maxEntries: 20, maxAgeSeconds: 300 } },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    css: false,
    setupFiles: ['./src/test/setup.ts'],
    // The Edge Functions carry their own pure helpers (the photo gate, the
    // prompt builder). They are plain TypeScript with no Deno API, so they
    // are tested here with the rest of the app.
    include: ['src/**/*.test.{ts,tsx}', 'supabase/functions/**/*.test.ts'],
    // Tests must not pick up a developer's .env.local; the boot test asserts
    // the unconfigured setup screen.
    env: {
      VITE_SUPABASE_URL: '',
      VITE_SUPABASE_ANON_KEY: '',
    },
  },
});
