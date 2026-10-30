import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  server: { host: '0.0.0.0', port: 5173 },
  preview: { host: '0.0.0.0', port: 4173 },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Cane Companion',
        short_name: 'Cane',
        description: 'Say where. Walk there.',
        theme_color: '#111827',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,json}'],
        runtimeCaching: [
          { urlPattern: /^https:\/\/inference\.baseten\.co\/.*/i, handler: 'NetworkOnly' }
        ]
      }
    })
  ]
});
