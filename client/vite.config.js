import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const envDir = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, envDir, '')
  return {
    plugins: [react()],
    resolve: {
      dedupe: ['react', 'react-dom'],
    },
    server: {
      proxy: {
        '/api/marketing': {
          target: env.VITE_MARKETING_API_TARGET || 'http://127.0.0.1:8099',
          changeOrigin: true,
        },
        '/api/finance': {
          target: env.VITE_FINANCE_API_TARGET || 'http://127.0.0.1:8099',
          changeOrigin: true,
        },
      },
    },
    worker: {
      format: 'es',
    },
  }
})
