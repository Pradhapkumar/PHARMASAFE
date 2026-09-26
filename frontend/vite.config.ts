import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    server: {
      port: 5173,
      host: true,
      proxy: {
        '/api': {
          target: env.VITE_API_BASE_URL
            ? env.VITE_API_BASE_URL.replace('/api/v1', '')
            : 'http://127.0.0.1:8000',
          changeOrigin: true,
        },
      },
    },
    define: {
      // Make VITE_API_BASE_URL available globally at build time
      __API_BASE__: JSON.stringify(
        env.VITE_API_BASE_URL || '/api/v1'
      ),
    },
  };
});
