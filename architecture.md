# Architecture

## The Core Concept

The runtime is a presentation-neutral facilitator. It owns what exists and how
it relates; it does not own how anything appears.

Applications, application instances, presentation surfaces, and the rendered
React tree are separate things. A surface refers to an application by stable
identity, and a child surface refers to its parent surface. React renders a
projection of these relationships.

This allows the same application model to appear as desktop windows, mobile
routes, embedded panels, or other presentations without making any presentation
system the owner of the application.

### Child surfaces and intentional projection

Every child surface identifies its parent. A parent does not store a list of
children, and an application does not duplicate that relationship in local
state. An outlet discovers its immediate children by querying for surfaces whose
`parentId` equals the outlet's current `surfaceId`.

```text
Current surface -> SurfaceOutlet -> surfaces claiming it as their parent
```

The React adapter provides each rendered application with its current surface
identity. An application chooses where to place a `SurfaceOutlet`; the runtime
relationship table determines which children appear there. Root outlets select
surfaces whose `parentId` is `null`.

Applications are not nodes in the surface tree. One application commonly has
one surface, but it may have several surfaces with different parents and
presentations. The runtime owns surface IDs and relationships; applications
request surfaces through the host API rather than creating or tracking those
relationships themselves.

## Responsibility Boundaries

### Runtime core

The core owns:

- application identity and lifecycle;
- surface identity and lifecycle;
- application-to-surface relationships;
- parent-to-child surface relationships;
- validation and atomic lifecycle commands;
- serializable runtime snapshots and lifecycle events.

The core does not own workspaces, position, size, stacking, focus, visibility,
minimizing, dragging, resizing, or adapter-specific data.

### React adapter

The React adapter connects runtime identities to registered application
components. It provides context, subscriptions, host capabilities, application
resolution, and surface outlets. It does not decide how a surface is presented.

### Presentation adapters

A presentation adapter projects runtime surfaces into windows, routes, sheets,
panels, or another interface. It owns all presentation state and interaction.

For example, the desktop adapter owns window records, workspaces, geometry,
stacking, focus, visibility, dragging, and resizing. Its state is keyed by the
runtime's stable surface IDs.

Presentation synchronization is one-way:

```text
Runtime snapshot -> presentation facilitator -> rendered presentation
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

The core records remain small and normalized:

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

The runtime may carry an optional application payload so the registered
component receives its intended inputs. The core does not define or interpret
that payload's shape.

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

## Rendering and State

The application registry maps an application's `typeId` to a stable React
component. The application renderer uses the surface relationship to resolve
the correct application and pass its identity and payload.

A React rerender does not clear component-local state. State is cleared only
when a component is unmounted or remounted, such as when its key or component
type changes. Stable IDs, keys, and registry component identities must therefore
be preserved.

View-local state may end with a surface. Durable or shared application state
must outlive the surface and remain application-owned.

## Guiding Rule

If a concept changes when desktop is replaced by mobile or another presentation,
it does not belong in the runtime core.
