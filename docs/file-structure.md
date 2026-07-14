# File structure

This repository is an npm-workspaces monorepo. The demo React app and the
publishable framework are separate workspaces.

```text
react-desktop-environment/
├── apps/
│   └── demo/
│       └── src/
│           ├── App.jsx
│           └── demos/
│               ├── window-manager/
│               └── compositor/
├── packages/
│   └── react-desktop-environment/
│       └── src/
│           ├── window-manager/
│           │   └── react/
│           ├── compositor/
│           │   ├── createCompositor.js
│           │   ├── index.js
│           │   └── react/
│           ├── ui/
│           └── index.js
├── docs/
├── package.json
└── package-lock.json
```

## Library workspace

`packages/react-desktop-environment` is the publishable package. Its dedicated
entry points make the framework boundaries visible:

- `window-manager` is the headless surface relationship engine;
- `window-manager/react` is its stock React consumption interface;
- `compositor` directs manager relationships, desktop state, applications, and
  interface connectors into a coherent desktop experience;
- `ui` is the replaceable stock visual implementation.

Each important abstraction states its conceptual responsibility through an
`ABSTRACTION` export in its `index.js`. Implementation technology may be grouped
inside an already named abstraction, as with `window-manager/react` and
`compositor/react`.

`createCompositor.js` keeps the cohesive non-React compositor mechanism together.
The `react` folder coordinates application and surface composition. The
compositor does not import the stock UI; consumers explicitly connect a
compatible interface.

React remains a peer dependency. Applications provide their own installation.
The library build writes publishable entry files to
`packages/react-desktop-environment/dist`.

## Demo workspace

`apps/demo` is private and never published. Its base route links to isolated
window-manager and compositor demonstrations. Source aliases point directly to
the library workspace so development cannot accidentally use an old build.

The compositor demo explicitly combines application resolution with the stock
UI connectors. The window-manager demo remains independent of compositor and
presentation behavior.

## Root workspace

The private root workspace coordinates shared development, build, and test
commands.
