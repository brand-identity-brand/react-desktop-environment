import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: {
        'react-desktop-environment': fileURLToPath(
          new URL('./src/index.js', import.meta.url),
        ),
        'window-manager': fileURLToPath(
          new URL('./src/window-manager/index.js', import.meta.url),
        ),
        'window-manager-react': fileURLToPath(
          new URL('./src/window-manager/react/index.js', import.meta.url),
        ),
        compositor: fileURLToPath(
          new URL('./src/compositor/index.js', import.meta.url),
        ),
        ui: fileURLToPath(
          new URL('./src/ui/index.js', import.meta.url),
        ),
      },
      formats: ['es'],
      fileName: (_format, entryName) => `${entryName}.js`,
    },
    rollupOptions: {
      external: ['react', 'react/jsx-runtime'],
    },
  },
  test: {
    environment: 'jsdom',
  },
})
