import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
// import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // VitePWA({
    //   registerType: 'autoUpdate',
    //   includeAssets: ['favicon.svg'],
    //   manifest: {
    //     name: 'Slippy Goalz Dashboard',
    //     short_name: 'Slippy Goalz',
    //     description: 'iPhone Repair Shop Management',
    //     theme_color: '#667eea',
    //     background_color: '#0f0c29',
    //     display: 'standalone',
    //     orientation: 'portrait',
    //     start_url: '/',
    //     icons: [
    //       { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    //       { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    //     ]
    //   }
    // })
  ],
  build: {
    minify: 'terser',
    terserOptions: {
      compress: { drop_console: true },
      mangle: { toplevel: true }
    }
  }
})