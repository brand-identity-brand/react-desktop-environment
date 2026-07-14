# File structure

This repository is an npm-workspaces monorepo. The demo React app and the publishable component library are separate workspaces with separate package manifests.

```text
react-desktop-environment/
├── apps/
│   └── demo/                         # Vite React demo; never published
│       ├── src/
│       │   ├── App.jsx               # Demo directory and route selection
│       │   ├── demos/
│       │   │   ├── window-manager/   # Headless manager-only demo
│       │   │   └── desktop-environment/ # Desktop implementation demo
│       │   └── main.jsx              # Demo application entry
│       ├── index.html
│       ├── package.json
│       └── vite.config.js
├── packages/
│   └── react-desktop-environment/    # Published component library
│       ├── src/
│       │   ├── window-manager/        # Headless external relationship state
│       │   │   └── react/             # Stock React providers and hooks
│       │   ├── desktop-environment/   # Desktop state and manager consumption
│       │   │   └── ui/                # React desktop components
│       │   ├── Button.jsx             # Plain HTML button component
│       │   ├── Button.test.jsx
│       │   └── index.js               # Public library entry
│       ├── package.json              # Library name and version
│       └── vite.config.js            # Library build configuration
├── docs/
│   └── file-structure.md
├── package.json                      # Private workspace root
└── package-lock.json                 # Shared dependency lockfile
```

## Library workspace

`packages/react-desktop-environment` is the only publishable package. It exposes
the combined package API plus dedicated `window-manager`,
`window-manager/react`, and `desktop-environment` entry points. `window-manager`
is a headless external state manager. `window-manager/react` supplies the stock
React providers, relationship hooks, selectors, and surface-scoped controller.
`desktop-environment` consumes manager snapshots and owns desktop presentation
state, while `desktop-environment/ui` renders that desktop using React.

The library build treats React as a peer dependency, so applications provide their own React installation. Running the workspace build writes publishable files to `packages/react-desktop-environment/dist`.

### Target source organization

The current `desktop-environment` implementation will be separated by software
responsibility rather than by rendering technology:

```text
src/
  window-manager/
    react/              # Official surface context and relationship interface

  compositor/
    desktop-state/      # Compositor-owned window state and persistence
    controllers/        # Headless application and window composition
    connectors/         # Consumer-supplied rendering contracts

  ui/                   # Replaceable default visual implementation
```

The compositor is the main consumer of `window-manager/react`. It owns desktop
state and coordinates application and window rendering, while `ui` consumes its
capability-based contract. This section describes the intended refactor; the
tree above continues to describe the files currently present.

## Demo workspace

`apps/demo` is a private Vite application for developing and manually checking
the library. It imports `react-desktop-environment` through the npm workspace
source entry points so development cannot use a stale package build. The base
route is a directory linking to `/window-manager` and `/desktop-environment`.
The manager route imports only the headless manager entry point. The desktop
route supplies application resolution and payload interfaces to the desktop
environment.

Demo code must stay inside `apps/demo`. It is not part of the library build and is not included when the component package is published.

## Root workspace

The root package is private and coordinates shared commands. `npm run dev` starts the demo, while `npm run build` and `npm test` run the corresponding scripts across the workspaces.
