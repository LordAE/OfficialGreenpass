// vite.config.js
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // For Option A (SEO hosts GreenPass under /app): set VITE_BASE=/app/
  // Default is '/' for local dev.
  const base = (env.VITE_BASE || '/').startsWith('/') ? (env.VITE_BASE || '/') : `/${env.VITE_BASE || ''}`

  return {
    base,
    plugins: [react()],
    server: {
      allowedHosts: true,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
      extensions: ['.mjs', '.js', '.jsx', '.ts', '.tsx', '.json'],
    },
    optimizeDeps: {
      esbuildOptions: {
        loader: {
          '.js': 'jsx',
        },
      },
    },
    build: {
      chunkSizeWarningLimit: 4000,
      reportCompressedSize: true,
    },
  }
})
