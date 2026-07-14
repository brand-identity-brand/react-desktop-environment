# Architecture

## The Core Concept

The window manager is a presentation-neutral relationship engine. It owns only
surface identity, parent relationships, and surface lifecycle. Every child
surface claims its parent; parents do not maintain child lists.

```js
surfaces[surfaceId] = {
  id: surfaceId,
  parentId,
}
```

The manager does not know about applications, windows, workspaces, geometry,
visibility, stacking, React, or UI.

## Compositor

The compositor uses the window manager as its lower-level surface engine. It
owns application identity and window presentation state:

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

The window key joins compositor state to a manager surface. `applicationId`
joins that window to a compositor application. Several windows may reference
the same application.

The compositor exposes namespaced operations:

```text
application.run / stop / update
window.run / stop / update
cleanup
```

`run` adds an owned record, `stop` removes one, and `update` replaces one.
Cleanup removes windows without manager surfaces and applications without
windows.

## Resident Presentation

Applications remain mounted while workspace or minimized state changes. These
values mark presentation visibility; they do not control application lifecycle.
A UI can use DOM attributes, CSS, or another presentation mechanism to show an
active workspace while retaining the same component instances.

```text
workspace switch → visibility change
minimize         → visibility change
window.stop      → surface presentation ends
application.stop → application and its presentations end
```

This creates a resident UI environment in the browser: applications remain
available while the interface selects which part of the environment is visible.

## Replaceable UI

The compositor coordinates meaning and state but does not define visual
appearance. Consumers manually connect it to the stock UI or their own
compatible components, similar to bootstrapping an application with a renderer.

An interface may consume any subset of optional compositor capabilities.
Missing capabilities remove corresponding features without invalidating the
compositor.

```text
window-manager
      → compositor
      → compositor/react
      → explicitly connected UI
```

## Application State

The compositor owns application identity, registration, and launch payload. The
application component owns the meaning and persistence of its business state.
State that must outlive a presentation should be stored by application identity
outside an individual mounted view.

## Record Ownership

Each abstraction owns its exact record shape. Records from another abstraction
are never mutated or decorated. Relationships use stable keys and explicit IDs.
Commands preserve references to unchanged records so subscribers can isolate
updates.
