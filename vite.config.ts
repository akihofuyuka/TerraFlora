import fs from 'fs';
import path from 'path';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';

const pkg = JSON.parse(
  fs.readFileSync(path.resolve(import.meta.dirname || process.cwd(), 'package.json'), 'utf8')
);

export default defineConfig({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  esbuild: {
    legalComments: 'inline',
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname || process.cwd(), './src'),
    },
  },
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'data/items.min.json',
        'data/prefixes.min.json',
        'data/armor-data.json',
        'data/xd-items.json',
        'atlas/items-0.png',
        'atlas/items-1.png',
        'atlas/items-2.png',
        'atlas/items-3.png',
        'atlas/items-4.png',
        'atlas/hairs.png',
        'atlas/player_base.png',
        'atlas/player_hairs.png',
        'atlas/player_hairs_alt.png',
        'atlas/accessories.png',
        'atlas/armor.png',
        'data/dyes.json',
        'data/materials.json'
      ],
      manifest: {
        name: 'TerraFlora',
        short_name: 'TerraFlora',
        description: 'TerraFlora',
        theme_color: '#2563eb',
        background_color: '#f8fafc',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,json}']
      }
    })
  ]
});
