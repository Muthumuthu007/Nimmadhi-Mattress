import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    // Explicit targets so output is deterministic rather than relying on Vite's
    // default. Includes Safari 13 so newer syntax (optional chaining, nullish
    // coalescing, class fields) is transpiled for older Safari / iOS WebKit.
    target: ['es2019', 'chrome87', 'edge88', 'firefox78', 'safari13'],
  },
  server: {
    proxy: {
      '/api/casting': {
        target: 'https://d3tat64zqbamt7.cloudfront.net',
        changeOrigin: true,
        secure: false,
      },
      '/api/grn': {
        target: 'https://d3tat64zqbamt7.cloudfront.net',
        changeOrigin: true,
        secure: false,
      },
      '/api/reports': {
        target: 'https://d3tat64zqbamt7.cloudfront.net',
        changeOrigin: true,
        secure: false,
      },
      '/api/users': {
        target: 'https://d3tat64zqbamt7.cloudfront.net',
        changeOrigin: true,
        secure: false,
      },
      '/api/stock': {
        target: 'https://d3tat64zqbamt7.cloudfront.net',
        changeOrigin: true,
        secure: false,
      },
      '/api/production': {
        target: 'https://d3tat64zqbamt7.cloudfront.net',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
