import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'url';

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url))
        }
    },
    base: './',
    server: {
        port: 5173
    },
    build: {
        outDir: 'build',
        emptyOutDir: true,
        rollupOptions: {
            output: {
                entryFileNames: 'assets/script.js',
                chunkFileNames: 'assets/[name].js',
                assetFileNames: (assetInfo) => {
                    if (assetInfo.name && assetInfo.name.endsWith('.css')) {
                        return 'assets/styles.css';
                    }
                    return 'assets/[name].[ext]';
                },
                manualChunks(id) {
                    if (id.includes('node_modules')) {
                        if (id.includes('three') || id.includes('@citizenfx/three')) {
                            return 'vendor-three';
                        }
                        if (id.includes('leaflet')) {
                            return 'vendor-leaflet';
                        }
                        // Keep react, radix, lucide, etc. in the main vendor chunk to avoid TDZ/Circular dependency issues
                        return 'vendor';
                    }
                }
            },
        },
    }
});