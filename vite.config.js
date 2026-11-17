import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.svg',
        'favicon.png',
        'icons.svg',
        'mswdo-logo.png',
        'mswdo-logo-maskable.png'
      ],
      manifest: {
        name: 'MSWDO Vinzons - Evacuee Management System',
        short_name: 'MSWDO Vinzons',
        description: 'Vinzons Evacuee Management & Relief Operations System',
        id: '/',
        theme_color: '#581c87',
        background_color: '#581c87',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/login',
        icons: [
          {
            src: '/mswdo-logo.png',
            sizes: '192x192 512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/mswdo-logo-maskable.png',
            sizes: '192x192 512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      }
    })
  ],
})
