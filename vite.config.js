import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  base: '/floor-is-lava/',
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        viewer: resolve(__dirname, 'viewer.html'),
      },
    },
  },
})
