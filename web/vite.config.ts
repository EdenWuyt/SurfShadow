import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'SurfShadow',
        short_name: 'SurfShadow',
        description: 'Mobile-first shadowing practice synced from the SurfShadow extension.',
        theme_color: '#102542',
        background_color: '#f5efe2',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('react-router-dom') || id.includes('react-router')) return 'vendor-router'
          if (id.includes('@supabase')) return 'vendor-supabase'
          if (
            id.includes('@tanstack') ||
            id.includes('@radix-ui') ||
            id.includes('lucide-react') ||
            id.includes('class-variance-authority') ||
            id.includes('tailwind-merge') ||
            id.includes('clsx') ||
            id.includes('react-dom') ||
            id.includes('react') ||
            id.includes('scheduler')
          ) {
            return 'vendor-framework'
          }
          return 'vendor-framework'
        },
      },
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', '@supabase/supabase-js'],
  },
  server: {
    port: 3000,
    hmr: {
      overlay: true,
    },
  },
})
