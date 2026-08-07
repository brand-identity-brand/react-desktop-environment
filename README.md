# React Desktop Environment

This repository is an npm-workspaces monorepo containing a React desktop framework and a separate Vite demo app.

The `react-desktop-environment` library contains a headless window manager, a
compositor, and replaceable React presentation. The window manager owns window
identity, parent relationships, and lifecycle. The compositor joins windows to
applications as independently identified Surfaces and owns their presentation
state.

## Commands

```sh
npm install
npm run dev
npm run build
npm test
```

See [`docs/file-structure.md`](docs/file-structure.md) for the workspace layout
and separation of responsibilities.

The demo base route is a directory with isolated pages for the headless window
manager and compositor.
