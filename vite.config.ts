import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import electron from 'vite-plugin-electron/simple'
import renderer from 'vite-plugin-electron-renderer'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    vue(),
    electron({
      main: {
        entry: 'electron/main.ts',
        vite: {
          build: {
            sourcemap: true,
            minify: false,
            rollupOptions: {
              external: ['electron', 'iconv-lite']
            }
          }
        }
      },
      preload: {
        input: 'electron/preload.ts',
        vite: {
          build: {
            sourcemap: 'inline',
            minify: false,
          }
        }
      },
      renderer: {},
    }),
    renderer()
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@main': resolve(__dirname, 'electron')
    }
  },
  root: '.',
  build: {
    outDir: 'dist',
    emptyOutDir: true
  },
  clearScreen: false
})
