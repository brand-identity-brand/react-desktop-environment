# Architecture

## The Core Concept

The window manager is a presentation-neutral facilitator. It owns what exists
and how it relates; it does not own how anything appears.

Applications, application instances, presentation surfaces, and any rendered
interface are separate things. A surface refers to an application by stable
identity, and a child surface refers to its parent surface. Consumers project
these relationships into their own interface.

This allows the same application model to appear as desktop windows, mobile
routes, embedded panels, or other presentations without making any presentation
system the owner of the application.

### Child surfaces and intentional projection

Every child surface identifies its parent. A parent does not store a list of
children, and an application does not duplicate that relationship in local
state. A consumer discovers immediate children by querying for surfaces whose
`parentId` equals the current `surfaceId`.

```text
Current surface -> child-surface query -> surfaces claiming it as their parent
```

The window manager exposes state reads and subscriptions through callbacks. A
consumer receives the current surface identity, queries its children, and
chooses where and how to render them. The window manager returns relationship
data; it does not provide a renderer or an outlet component. A root consumer
selects surfaces whose `parentId` is `null`.

Applications are not nodes in the surface tree. One application commonly has
one surface, but it may have several surfaces with different parents and
presentations. The window manager owns surface IDs and relationships;
applications request surfaces through its public commands rather than creating
or tracking those relationships themselves.

## Responsibility Boundaries

### Window manager

The window manager is a headless external state manager. It owns:

- application identity and lifecycle;
- surface identity and lifecycle;
- application-to-surface relationships;
- parent-to-child surface relationships;
- validation and atomic lifecycle commands;
- serializable runtime snapshots and lifecycle events;
- read, command, query, and callback subscription interfaces for consumers.

It does not import React, render components, or provide `ApplicationRenderer` or
`SurfaceOutlet` components. It also does not own workspaces, position, size,
stacking, focus, visibility, minimizing, dragging, resizing, or adapter-specific
data.

### Desktop environment

The desktop environment is a consumer of the window manager. It subscribes to
window-manager state, resolves application records using consumer-supplied
interfaces, and projects surfaces as desktop windows. Any React context,
component resolution, child rendering mechanism, or outlet-like UI belongs to
this implementation rather than the window manager.

The desktop environment owns window records, workspaces, geometry, stacking,
focus, visibility, dragging, and resizing. Its state is keyed by stable surface
IDs from the window manager.

### Other consumers

Mobile, embedded, server, or non-React consumers may subscribe to the same
window manager and project its records differently. Each consumer owns its own
presentation state, rendering technology, and interaction model.

Presentation synchronization is one-way:

```text
Window-manager snapshot -> presentation facilitator -> rendered presentation
```

The presentation reconciles its records with the current runtime snapshot. If a
surface no longer exists in the runtime, its presentation record can be safely
removed.

### Applications

Applications own the meaning, sharing, persistence, and disposal of their
business state. State that must survive a surface unmount or be shared by
multiple surfaces should be keyed by application ID outside any individual
view.

## Minimal Runtime Records

The window-manager records remain small and normalized:

```js
application = {
  id,
  typeId,
  payload, // optional, opaque, and consumer-defined
}

surface = {
  id,
  applicationId,
  parentId,
}
```

The window manager may carry an optional application payload so a consumer can
provide it to its resolved application. The window manager does not define or
interpret that payload's shape.

Presentation records are separate:

```js
desktopWindow = {
  surfaceId,
  workspaceId,
  position,
  size,
  zIndex,
  minimized,
}
```

## Consumer Rendering and State

A consumer may accept a registry or resolver callback that maps an application's
`typeId` to something it can render. This resolution contract belongs to the
consumer; there is no standard `ApplicationRenderer` in the window manager.

When the desktop environment uses React, a rerender does not clear
component-local state. State is cleared only when a component is unmounted or
remounted, such as when its key or component type changes. The desktop
environment must therefore preserve stable IDs, keys, and resolved component
identities.

View-local state may end with a surface. Durable or shared application state
must outlive the surface and remain application-owned.

## Guiding Rule

If a concept changes when desktop is replaced by mobile or another presentation,
it does not belong in the window manager.

The window manager exposes state and relationships. Consumers decide how to
render them.
