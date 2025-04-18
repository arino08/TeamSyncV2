import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { IncomingMessage } from 'http';

declare module 'http' {
  interface IncomingMessage {
    body?: any;
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '/api'),
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response:', {
              url: req.url,
              status: proxyRes.statusCode,
              contentType: proxyRes.headers['content-type']
            });
          });
        }
      }
    }
  },
  optimizeDeps: {
  },
});
