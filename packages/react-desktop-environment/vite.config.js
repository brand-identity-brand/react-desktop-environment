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
        'desktop-environment': fileURLToPath(
          new URL('./src/desktop-environment/index.js', import.meta.url),
        ),
      },
      name: 'ReactDesktopEnvironment',
      formats: ['es', 'cjs'],
      fileName: (format, entryName) =>
        `${entryName}.${format === 'es' ? 'js' : 'cjs'}`,
    },
    rollupOptions: {
      external: ['react', 'react/jsx-runtime'],
    },
  },
  test: {
    environment: 'jsdom',
  },
})
