import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const isVercelBuild = process.env.VERCEL === '1' && process.env.NETLIFY !== 'true'

// https://vite.dev/config/
export default defineConfig({
  base: isVercelBuild ? '/biblioteca/' : '/',
  plugins: [react()],
  build: {
    outDir: isVercelBuild ? 'dist/biblioteca' : 'dist',
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3333',
    },
  },
})
