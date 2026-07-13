import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: fileURLToPath(new URL('./src/index.js', import.meta.url)),
      name: 'ReactDesktopEnvironment',
      formats: ['es', 'cjs'],
      fileName: (format) =>
        format === 'es'
          ? 'react-desktop-environment.js'
          : 'react-desktop-environment.cjs',
    },
    rollupOptions: {
      external: ['react', 'react/jsx-runtime'],
    },
  },
  test: {
    environment: 'jsdom',
  },
})
