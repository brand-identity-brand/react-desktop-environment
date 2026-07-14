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

The headless manager does not import React or render components. It also does
not own workspaces, position, size, stacking, focus, visibility, minimizing,
dragging, resizing, or adapter-specific data.

### Window-manager React interface

`window-manager/react` is the official React interface to the headless manager.
It provides manager context, current-surface context, relationship hooks, and
surface controllers. It may expose generic child-surface rendering callbacks,
but it does not describe a child as a window or own desktop state.

This interface raises the normal consumer API above manual external-store
subscriptions while preserving the dependency direction:

```text
window-manager/react -> window-manager
```

### Compositor

The compositor is the primary consumer of `window-manager/react`. It is a
headless React composition system that gives manager relationships desktop
meaning. It owns desktop window state, reconciliation, workspaces, geometry,
stacking, focus, visibility, persistence, hydration, and z-index normalization.

Desktop state remains grouped inside the compositor so state transitions and
persistence do not scatter through rendering code:

```text
compositor/
  desktop-state/
  controllers/
  connectors/
```

The compositor coordinates application and window rendering through
consumer-supplied connectors. It carries the current surface context, joins
manager records with compositor-owned window records, and exposes controllers
such as child-window and hidden-window rendering. It does not define visual
markup or import the default UI.

### UI

`ui` is the replaceable visual implementation. It consumes compositor
controllers and render functions to provide desktops, window frames, title
bars, taskbars, and other controls. Consumers may replace one component or the
entire UI while keeping compositor behavior.

The UI contract is capability-based. Missing optional capabilities reduce
available features without corrupting state or breaking unrelated rendering.
For example, omitting a hidden-window component removes taskbar restoration UI,
and omitting resize controls removes resizing from that UI.

### Record ownership and joins

Each system keeps the exact shape of the records it owns. A consumer must not
mutate, extend, spread, or reshape a record supplied by another system.
Consumers join their own records to foreign records through stable object keys.

```js
windowManagerSnapshot.surfaces[surfaceId] = {
  id,
  applicationId,
  parentId,
}

compositorSnapshot.windows[surfaceId] = {
  workspaceId,
  position,
  size,
  zIndex,
  minimized,
}
```

The shared `surfaceId` key is the relationship. The compositor-owned window
record does not copy the surface, repeat its ID as a field, or add desktop
properties to it.

### Other consumers

Mobile, embedded, server, or non-React consumers may subscribe to the same
window manager and project its records differently. Each consumer owns its own
presentation state, rendering technology, and interaction model.

Presentation synchronization is one-way:

```text
Window-manager snapshot -> compositor -> UI
```

The compositor reconciles its records with the current manager snapshot. If a
surface no longer exists in the manager, its window record can be safely
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

Presentation records are separate and keyed by the related surface ID:

```js
windows = {
  [surfaceId]: {
    workspaceId,
    position,
    size,
    zIndex,
    minimized,
  },
}
```

## Persistence and Initialization

The compositor persists its desktop records separately from the window manager.
During initialization it removes entries without current surfaces, adds
defaults for new surfaces, and normalizes saved z-index values while preserving
their relative order. Normalization happens before rendering, not on every
focus update.

## Snapshot Identity

Snapshots are read-only by contract. Consumers must not mutate records they do
not own. Commands replace only the records they change, while unchanged records
retain their object references.

This structural sharing allows a subscriber to select one record and avoid a
rerender when another record changes. `Object.freeze()` may be used as a
development safeguard, but defensive cloning or refreezing every record is not
the architecture's immutability mechanism.

## Consumer Rendering and State

A consumer supplies the compositor with a registry, resolver, or application
rendering callback that maps an application's `typeId` to something renderable.
The compositor coordinates resolution and surface context without owning the
application component or its state.

A React rerender does not clear component-local state. State is cleared only
when a component is unmounted or remounted, such as when its key or component
type changes. The compositor must therefore preserve stable IDs, keys, and
resolved component identities.

View-local state may end with a surface. Durable or shared application state
must outlive the surface and remain application-owned.

## Guiding Rule

If a concept changes when desktop is replaced by mobile or another presentation,
it does not belong in the window manager.

The window manager exposes state and relationships. Consumers decide how to
render them.

```text
window-manager
      -> window-manager/react
      -> compositor (owns desktop state)
      -> replaceable UI
```
