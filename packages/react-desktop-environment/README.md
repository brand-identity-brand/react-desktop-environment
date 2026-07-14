# react-desktop-environment

A headless window manager with a React desktop-environment implementation.

## Installation

```sh
npm install react-desktop-environment
```

## Window manager and desktop environment

```jsx
import {
  createWindowManager,
} from 'react-desktop-environment/window-manager'
import {
  Desktop,
  DesktopEnvironment,
  createDesktopEnvironment,
} from 'react-desktop-environment/desktop-environment'

const applicationTypes = {
  notes: NotesApplication,
}

const windowManager = createWindowManager()
const desktopEnvironment = createDesktopEnvironment({ windowManager })

const renderApplication = ({ application, surface, host, renderChildren }) => {
  const Component = applicationTypes[application.typeId]

  return (
    <Component
      applicationId={application.id}
      surfaceId={surface.id}
      payload={application.payload}
      host={host}
      renderChildren={renderChildren}
    />
  )
}

export default function App() {
  return (
    <DesktopEnvironment
      windowManager={windowManager}
      desktopEnvironment={desktopEnvironment}
      renderApplication={renderApplication}
    >
      <Desktop workspaceId="main" />
    </DesktopEnvironment>
  )
}
```

The window manager is an external state manager with no React dependency. It
owns application identity, surface identity, lifecycle, and parent-child surface
relationships. It exposes snapshots, selectors, commands, and callback
subscriptions.

The desktop environment consumes those snapshots in one direction and owns
workspace, visibility, ordering, geometry, and other desktop concerns. A
consumer supplies the callback that resolves application records into UI.

Applications receive a `renderChildren` callback and choose where to invoke it.
The callback renders surfaces whose `parentId` claims the application's current
surface. The window manager does not provide an outlet or renderer component.

Commands can also be created as values and dispatched:

```js
import {
  createLaunchApplicationCommand,
  createWindowManager,
} from 'react-desktop-environment/window-manager'

const windowManager = createWindowManager()
const launchNotes = createLaunchApplicationCommand({
  typeId: 'notes',
  payload: { documentId: 'document:1' },
})

windowManager.dispatch(launchNotes)
```

## Button

```jsx
import { Button } from 'react-desktop-environment'

export default function SaveButton() {
  return <Button type="button">Save</Button>
}
```
