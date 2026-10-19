import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/painel/' : '/',
  plugins: [react()],
  build: {
    outDir: 'dist/painel',
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
}))