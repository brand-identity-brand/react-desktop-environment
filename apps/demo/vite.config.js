import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: /^react-desktop-environment\/window-manager\/react$/,
        replacement: fileURLToPath(
          new URL(
            '../../packages/react-desktop-environment/src/window-manager/react/index.js',
            import.meta.url,
          ),
        ),
      },
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
        find: /^react-desktop-environment\/compositor$/,
        replacement: fileURLToPath(
          new URL(
            '../../packages/react-desktop-environment/src/compositor/index.js',
            import.meta.url,
          ),
        ),
      },
      {
        find: /^react-desktop-environment\/ui$/,
        replacement: fileURLToPath(
          new URL(
            '../../packages/react-desktop-environment/src/ui/index.js',
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
