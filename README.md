# React Desktop Environment

This repository is an npm-workspaces monorepo containing a React desktop framework and a separate Vite demo app.

The `react-desktop-environment` library is at version `1.0.0`. It contains a
headless window manager, a compositor that directs the desktop experience, and
a replaceable React interface. The window manager owns only surface identity,
parent relationships, and lifecycle; the compositor owns applications and
presentation state.

## Commands

```sh
npm install
npm run dev
npm run build
npm test
```

See [`docs/file-structure.md`](docs/file-structure.md) for the workspace layout and separation of responsibilities.

The demo base route is a directory with isolated pages for the headless window
manager and compositor.
