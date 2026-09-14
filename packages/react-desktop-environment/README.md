# react-desktop-environment

A logical window manager, compositor, recursive Applet runtime, and checkpoint
recovery with replaceable React presentation.

## Window manager

The manager owns logical window identity, lifecycle, and parent relationships.
Creating a record and adding it to the table are intentionally separate.

```js
import { createWindowManager } from 'react-desktop-environment/window-manager'

const windowManager = createWindowManager()
const rootWindow = windowManager.window.create()
windowManager.window.add({ window: rootWindow })

const childWindow = windowManager.window.create({
  parentWindowId: rootWindow.windowId,
})
windowManager.window.add({ window: childWindow })
```

## Compositor

The compositor owns applications and independently identified surfaces. A
surface links a current window object to a current application object and adds
presentation state without changing either source record.

```js
import {
  SurfaceComposer,
  createCompositor,
} from 'react-desktop-environment/compositor'

const compositor = createCompositor({
  windowManager,
  applicationRegistry: { NotesApplication },
  surfaceComponentRegistry: { DesktopSurface },
  defaultSurfaceComponentName: 'DesktopSurface',
})

const application = compositor.application.create({
  applicationName: 'NotesApplication',
  props: { documentId: 'document:1' },
})
compositor.application.add({ application })

const surface = compositor.surface.create({
  windowId: childWindow.windowId,
  applicationId: application.applicationId,
})
compositor.surface.add({ surface })

compositor.surface.selectChild({
  surfaceId: rootSurface.surfaceId,
  childSurfaceId: surface.surfaceId,
})
```

Each parent Surface owns selection only among its immediate child Surfaces.
This keeps recursive selection in compositor state while Application and Window
records remain independent.

`SurfaceComposer` receives its stable dependencies explicitly. It uses no
context and subscribes directly to the child surfaces of the supplied surface.

```jsx
<SurfaceComposer
  compositor={compositor}
  surfaceId={rootSurface.surfaceId}
>
  <DesktopControls />
</SurfaceComposer>
```

The compositor preserves unchanged record references. Updating a window or
application replaces only surfaces linked to that record. Hidden and inactive
workspace surfaces remain composed. Presentation owners may withdraw visual
material while their occurrence and retained working state continue.

## Applet engine

```js
import { AppletEngine, AppletEnvironment, createAppletEngine } from 'react-desktop-environment/applet-engine'
```

The [Applet runtime](./src/applet-engine/README.md) owns recursive registration,
engine lifetime, Application state, resident Decks, checkpoints, and occurrence
themes. Consumers supply their Applet definitions and root composition material.
The definition binder and direct constructor share the same composition API and
canonical React contexts. Resident admission is independent of resident supply.

## Checkpoint recovery

```js
import { createAppletPersistence, resolveInitialAppletCheckpoint } from 'react-desktop-environment/applet-persistence'
import { createIndexedDbAppletStore } from 'react-desktop-environment/applet-persistence/indexed-db'
```

The [storage-neutral core](./src/applet-persistence/README.md) composes an opaque
scope, checkpoint source, and store. The [explicit IndexedDB adapter](./src/applet-persistence/indexed-db/README.md)
accepts a host database name and keeps complete checkpoints in version-one
scoped records. Host authentication, browser lifecycle, save/reset, and
application replacement remain with consumers.

## Package consumption

Public entries advertise ESM output. Production imports resolve built `dist`
entries; the development condition resolves source for tooling that transforms
JSX. React 19.2.8-compatible React is a peer dependency and is not bundled.
All Applet consumers use the same public entry and consumer React installation.
Window manager, compositor, their React bindings, and UI remain independently
usable without importing the Applet engine or browser storage adapter.

```sh
npm test
npm run build
npm run test:package --workspace react-desktop-environment
```

The last command packs this package and installs the tarball into a temporary
independent consumer. It checks public ESM imports, an unrelated Applet tree,
shared contexts, occurrence state and identity, checkpoint restoration, and
explicit recovery using the actual artifact.
