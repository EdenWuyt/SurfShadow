import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { visualizer } from 'rollup-plugin-visualizer';
export default defineConfig(function (_a) {
    var mode = _a.mode;
    var shouldAnalyze = mode === 'analyze';
    var shouldEmitSourcemaps = mode === 'analyze' || mode === 'debug';
    var baselineTarget = ['chrome107', 'edge107', 'firefox104', 'safari16'];
    return {
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
            shouldAnalyze
                ? visualizer({
                    filename: 'dist/bundle-analysis.html',
                    gzipSize: true,
                    brotliSize: true,
                    open: false,
                })
                : null,
        ].filter(Boolean),
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src'),
            },
        },
        build: {
            // This Vite/esbuild version does not accept the baseline alias directly, so we pin the equivalent browser set.
            target: baselineTarget,
            sourcemap: shouldEmitSourcemaps,
            chunkSizeWarningLimit: 500,
            rollupOptions: {
                output: {
                    manualChunks: function (id) {
                        if (!id.includes('node_modules'))
                            return undefined;
                        if (id.includes('react-router-dom') || id.includes('react-router'))
                            return 'vendor-router';
                        if (id.includes('@supabase'))
                            return 'vendor-supabase';
                        return 'vendor-framework';
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
    };
});
