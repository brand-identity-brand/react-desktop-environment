import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: /^react-desktop-environment\/window-manager$/,
        replacement: fileURLToPath(
          new URL(
            '../../packages/react-desktop-environment/src/window-manager/index.js',
            import.meta.url,
          ),
        ),
      },
      {
        find: /^react-desktop-environment\/desktop-environment$/,
        replacement: fileURLToPath(
          new URL(
            '../../packages/react-desktop-environment/src/desktop-environment/index.js',
            import.meta.url,
          ),
        ),
      },
      {
        find: /^react-desktop-environment$/,
        replacement: fileURLToPath(
          new URL(
            '../../packages/react-desktop-environment/src/index.js',
            import.meta.url,
          ),
        ),
      },
    ],
  },
})
