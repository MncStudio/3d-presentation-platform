import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  plugins: [vue()],
  base: './',
  root: resolve(__dirname, 'src'),
  build: {
    outDir: resolve(__dirname, 'dist-web'),
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
})
