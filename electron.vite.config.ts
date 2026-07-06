import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'out/main',
      lib: {
        entry: resolve('electron/main/index.ts'),
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'out/preload',
      lib: {
        entry: resolve('electron/preload/index.ts'),
      },
    },
  },
  renderer: {
    root: resolve('src'),
    build: {
      outDir: 'out/renderer',
      rollupOptions: {
        input: resolve('src/index.html'),
      },
    },
    plugins: [vue()],
    resolve: {
      alias: {
        '@': resolve('src'),
      },
    },
  },
})
