import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');

    // Validate required environment variables in production
    if (mode === 'production') {
      const required = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
      const missing = required.filter(key => !env[key]);
      if (missing.length > 0) {
        console.warn(`Warning: Missing environment variables: ${missing.join(', ')}`);
      }
    }

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        // Generate source maps for production debugging
        sourcemap: true,
        // Target modern browsers for smaller bundle
        target: 'es2020',
        // Chunk splitting for better caching
        rollupOptions: {
          output: {
            manualChunks: {
              'react-vendor': ['react', 'react-dom'],
              'query-vendor': ['@tanstack/react-query'],
              'supabase-vendor': ['@supabase/supabase-js'],
            }
          }
        }
      }
    };
});
