# react-desktop-environment

A surface relationship engine, application compositor, and replaceable React
desktop interface.

## Installation

```sh
npm install react-desktop-environment
```

## Bootstrap a desktop

```jsx
import { useState } from 'react'
import {
  CompositorProvider,
  WorkspaceComposer,
  createCompositor,
} from 'react-desktop-environment/compositor'
import { createWindowManager } from 'react-desktop-environment/window-manager'
import { defaultCompositorConnectors } from 'react-desktop-environment/ui'

const applicationRegistry = {
  NotesApplication,
}

const windowManager = createWindowManager()
const compositor = createCompositor({
  windowManager,
  applicationRegistry,
})

compositor.application.run({
  registeredApplicationName: 'NotesApplication',
  payload: { documentId: 'document:1' },
})

export default function Desktop() {
  const [activeWorkspaceId, setActiveWorkspaceId] = useState('default')

  return (
    <CompositorProvider
      compositor={compositor}
      connectors={defaultCompositorConnectors}
    >
      <WorkspaceComposer activeWorkspaceId={activeWorkspaceId} />
    </CompositorProvider>
  )
}
```

Consumers explicitly connect the compositor to the stock UI or their own
compatible connectors. The compositor never imports the stock interface.

## Compositor operations

```js
const { application, window } = compositor

const { applicationId, surfaceId } = application.run({
  registeredApplicationName: 'NotesApplication',
  payload: { documentId: 'document:1' },
})

const secondSurfaceId = window.run({
  applicationId,
  workspaceId: 'second',
})

application.update(applicationId, { payload: nextPayload })
window.update(surfaceId, { minimized: true })
window.stop(secondSurfaceId)
application.stop(applicationId)
```

`run` adds an owned record, `stop` removes one, and `update` replaces one while
preserving unrelated record references. `cleanup()` removes compositor windows
whose surfaces no longer exist and applications no longer referenced by any
window.

## Ownership

The window manager owns only surfaces and parent relationships:

```js
surfaces[surfaceId] = { id, parentId }
```

The compositor owns applications and windows:

```js
applications[applicationId] = {
  registeredApplicationName,
  payload,
}

windows[surfaceId] = {
  applicationId,
  workspaceId,
  zIndex,
  minimized,
  position,
  size,
}
```

Workspace and minimization change presentation visibility without determining
whether an application is mounted. Closing a surface or stopping an application
ends its presentation lifecycle.
