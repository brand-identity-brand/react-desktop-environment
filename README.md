# React Desktop Environment

This repository is an npm-workspaces monorepo containing a React desktop-environment library and a separate Vite demo app.

The `react-desktop-environment` library is at version `1.0.0`. It contains a
headless window manager and a React desktop environment that consumes it. The
window manager owns application and surface relationships but contains no React
or presentation behavior.

## Commands

```sh
npm install
npm run dev
npm run build
npm test
```

See [`docs/file-structure.md`](docs/file-structure.md) for the workspace layout and separation of responsibilities.
