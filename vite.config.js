import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './', // ✅ this fixes asset loading in Electron
  plugins: [react()],
  server: {
    proxy: {
      // 🔁 Glitch API (dev only)
      '/api': {
        target: 'https://grey-gratis-ice.glitch.me',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
      // 🧠 Local Express API (dev only)
      '/presentations': {
        target: 'http://localhost:5050',
        changeOrigin: true,
        secure: false,
      },
      '/slide': {
        target: 'http://localhost:5050',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  }
});