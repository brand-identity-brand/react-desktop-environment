# react-desktop-environment

A logical window manager and compositor with replaceable React presentation.

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
```

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
workspace surfaces remain composed so their application-local React state can
remain mounted.
