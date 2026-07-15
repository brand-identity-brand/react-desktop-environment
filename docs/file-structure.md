# File structure

This repository is an npm-workspaces monorepo. The demo React app and the
publishable framework are separate workspaces.

## Files represent abstractions

The file and folder structure should communicate the software architecture
before a developer reads the implementation. Each file should represent one
clearly named primary abstraction whenever possible, and its filename should
name that abstraction. A module with one primary abstraction is understood as
representing that concept, rather than as a container of unrelated exports.

Create another file when a concept has an independent architectural reason to
exist, not merely to shorten an implementation. Conversely, keep private
implementation details with the abstraction that owns them so the file tree
does not present internal machinery as independent architecture.

Modules that intentionally define a collection or grouped public interface are
the exception. Their filenames should name the collection or interface, and
their exports should remain cohesive within that boundary. The JavaScript
export convention that expresses these rules is defined in
[Code Style](./code-style.md#match-file-names-to-default-exports).

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

- `window-manager` owns logical window identity, lifecycle, and parent
  relationships;
- `window-manager/react` is its stock React consumption interface;
- `compositor` owns applications and surfaces that compose manager windows with
  presentation state and supplies their standard controls;
- `ui` is the replaceable stock visual implementation. Its default `Window`
  decides which visual interactions invoke compositor-supplied controls.

Each important abstraction states its conceptual responsibility through an
`ABSTRACTION` export in its `index.js`. Implementation technology may be grouped
inside an already named abstraction, as with `window-manager/react` and
`compositor/react`.

`createCompositor.js` keeps the cohesive non-React compositor mechanism together.
The `react` folder contains the prop-driven recursive `SurfaceComposer`. The
compositor does not import a stock UI; consumers supply registered surface and
application components. The composer connects compositor controls to those
surface components.

React remains a peer dependency. Applications provide their own installation.
The library build writes publishable entry files to
`packages/react-desktop-environment/dist`.

## Demo workspace

`apps/demo` is private and never published. Its base route links to isolated
window-manager and compositor demonstrations. Source aliases point directly to
the library workspace so development cannot accidentally use an old build.

The compositor demo explicitly combines application and surface registries
without context. The window-manager demo remains independent of compositor and
presentation behavior.

## Root workspace

The private root workspace coordinates shared development, build, and test
commands.
