# File structure

This repository is an npm-workspaces monorepo. The demo React app and the publishable component library are separate workspaces with separate package manifests.

```text
react-desktop-environment/
├── apps/
│   └── demo/                         # Vite React demo; never published
│       ├── src/
│       │   ├── App.jsx               # Demo UI
│       │   └── main.jsx              # Demo application entry
│       ├── index.html
│       ├── package.json
│       └── vite.config.js
├── packages/
│   └── react-desktop-environment/    # Published component library
│       ├── src/
│       │   ├── Button.jsx            # Plain HTML button component
│       │   ├── Button.test.jsx
│       │   └── index.js              # Public library entry
│       ├── package.json              # Library name and version
│       └── vite.config.js            # Library build configuration
├── docs/
│   └── file-structure.md
├── package.json                      # Private workspace root
└── package-lock.json                 # Shared dependency lockfile
```

## Library workspace

`packages/react-desktop-environment` is the only publishable package. Its `src/index.js` file defines the complete public API. At version `1.0.0`, that API contains only the named `Button` export.

The library build treats React as a peer dependency, so applications provide their own React installation. Running the workspace build writes publishable files to `packages/react-desktop-environment/dist`.

## Demo workspace

`apps/demo` is a private Vite application for developing and manually checking the library. It imports `react-desktop-environment` through the npm workspace link, in the same style as an external consumer.

Demo code must stay inside `apps/demo`. It is not part of the library build and is not included when the component package is published.

## Root workspace

The root package is private and coordinates shared commands. `npm run dev` starts the demo, while `npm run build` and `npm test` run the corresponding scripts across the workspaces.
