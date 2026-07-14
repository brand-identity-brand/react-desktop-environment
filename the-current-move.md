# The Next Move

Status: architectural direction for the preproduction rewrite of `react-desktop-environment`

## Mission

`react-desktop-environment` is a portable React application runtime that separates application ownership from presentation.

Applications own the meaning and behavior of their internal state. The runtime owns application identity, lifecycle, and the relationships between application views. The project may also host consumer-supplied application state when a consumer chooses that arrangement, but it does not prescribe a state library, schema, hydration strategy, or persistence adapter. Shells, desktop environments, and window managers decide where and how application views appear.

A desktop environment and a window manager are means of presenting the runtime. They are not the mission itself.

The purpose of the package is to let one application model be projected through desktop, mobile, embedded, nested, or future presentation systems without making any one of those systems the owner of the application.

## Why This Project Exists

The project began as a desktop environment because a desktop makes application relationships visible. Windows expose application identity, parent-child relationships, focus, ordering, hiding, restoration, and multiple simultaneous views. Building the desktop first was a practical way to discover the runtime underneath it.

The valuable result is not merely a collection of draggable React windows. It is a model in which applications, application instances, presentation surfaces, and the rendered component tree are different things.

That separation creates the possibility of:

- presenting the same application through different shells;
- giving one application instance more than one view;
- moving a view without moving application ownership;
- supporting nested desktops, portals, workspaces, and embedded application hosts;
- letting desktop and mobile interfaces refer to the same application identity;
- restoring runtime and presentation relationships independently of application state;
- replacing the window manager without rewriting the applications;
- allowing an application to choose where its immediate child surfaces are projected.

The prototype was written through rapid experiments. Its duplicate files, temporary names, hard-coded roots, incomplete APIs, and partially explored state systems are evidence of discovery, not the desired package structure. The preproduction rewrite should preserve the architectural discoveries without preserving every experimental implementation decision.

## The Most Valuable Architectural Idea

The React tree should be a projection of the runtime model, not the only place where the runtime exists.

The prototype already points toward three related collections:

- an application-type registry that resolves a type identifier to a React implementation;
- application-instance records that give running applications stable identity and lifecycle;
- presentation-surface records that associate a view with an application and place it relative to other surfaces.

This is why relational-database thinking is useful even when the implementation is an in-memory store rather than SQL. A surface refers to an application through a stable identifier. A child surface refers to its parent. A workspace contains ordered surfaces. A renderer queries those relationships and projects them into React.

The relationships are the durable architecture. The current DOM arrangement is one possible result of those relationships.

This model makes it possible to ask useful questions without inspecting the React component tree: Which surfaces present this application? Which surfaces belong to this workspace? Which application owns this child view? Which view should receive focus? Can this desktop projection be replaced by a mobile projection?

The model should remain small and normalized. Presentation details should not become application data, and application internals should not become runtime data.

## Application State Ownership and Optional Hosting

The runtime core should not define or interpret application state. The project may, however, host application state as part of the application environment when a consumer chooses to connect state at the root. Hosting state is not the same as owning its meaning: the consumer still decides how that state is created, hydrated, updated, persisted, synchronized, and disposed.

An application may use local React state, its own Zustand store, a state machine, a server, a database, a collaborative document, or any other state system. It may choose to persist, synchronize, hydrate, or discard that state. Those choices belong to the application.

The project should not require consumers to implement an application-state component, connector, or adapter merely to participate in runtime lifecycle. Instead, the desktop environment's root component should expose optional callback props. These callbacks provide the values already available during initialization and runtime updates, allowing consumers to connect their state system directly.

The initial callback direction is:

```tsx
<DesktopEnvironment
  onInitialize={(context) => {
    // Connect or hydrate consumer-owned state using the full root context.
  }}
  onRuntimeEvent={(event, context) => {
    // Observe application lifecycle and surface updates.
  }}
/>
```

`onInitialize` should receive the runtime, registry, public commands, and current snapshot. It may return a promise when a consumer needs to complete hydration before the root renders the application environment; the root may show an optional initialization fallback while it waits. `onRuntimeEvent` should receive the semantic event, its command input, the affected application and surface records when relevant, the previous snapshot, the resulting snapshot, and the same public runtime context. Events should cover application launch and closure as well as surface opening, focus, visibility, placement, movement, and closure.

These callbacks are optional observation and integration points, not a second framework. Consumers may connect Zustand, Redux, IndexedDB, local storage, a server, or a custom state system directly. A consumer that does not need them should not have to configure them.

The runtime provides application identifiers, launch metadata, lifecycle notifications, and host capabilities. If the project hosts consumer state, that state must remain opaque to the runtime core and keyed by application identity. Consumers retain control of its meaning and lifetime.

If several surfaces present the same application instance, the application must place shared state somewhere that outlives any one view. That state is still application-owned. The runtime supplies the common application identifier; the application decides how views associated with that identifier share data.

Window state is different from application state. Position, size, visibility, focus order, workspace, parent surface, and presentation mode are concerns of the presentation system. A desktop window manager may own them. A mobile renderer may replace them with navigation position, sheet mode, or route history. The generic runtime should not assume that every surface is a desktop window.

The experimental `useKernelState` direction should therefore not define the core runtime. A consumer may build a persistence adapter if it is useful to that consumer, but the project should not require an adapter interface or force consumers to write an adapter for the project's own abstraction.

Callbacks may expose complete records and snapshots, but observation must not become uncoordinated mutation. Consumers can read all runtime information and invoke all public commands; writes to identity, lifecycle, and surface relationships still go through commands so the runtime can preserve its invariants.

## The Window Manager Is Intentionally Influential

Applications that use the runtime's full capabilities will be written for its application-host protocol. This influence is not automatically a design flaw. Every application platform defines lifecycle, rendering, navigation, capability, and communication contracts.

The real requirement is to make that influence explicit, small, and stable.

Applications should depend on a public host contract rather than raw Zustand stores, internal renderer names, hard-coded root IDs, or knowledge of how the desktop shell happens to be implemented. The contract may allow an application to open a surface, close a surface, request focus, inspect its own identity, and place an outlet for immediate child surfaces.

The package should be opinionated about the host protocol while remaining replaceable at the presentation layer.

## Intentional Immediate-Child Projection

The prototype's most unusual decision is that an application can decide where its immediate child windows are rendered. This replaced a single recursive god-renderer with intentional recursion distributed through application-defined outlets.

That idea should be preserved.

It enables nested desktops, application-owned subwindow regions, portals, split interfaces, embedded shells, and alternate presentation layouts. It also makes the runtime different from a conventional flat desktop window manager.

The preproduction version should formalize this as a generic surface outlet. An application that wants to host child surfaces places an outlet in its layout. The active shell supplies the renderer used by that outlet. A desktop shell can render children as windows; a mobile shell can render them as routes or sheets; an embedded shell can render them inside a bounded region.

Applications should not import a desktop-specific child-window renderer. They should declare a presentation outlet through the React runtime adapter.

This preserves the power of the experimental architecture while removing accidental coupling to its current implementation.

## Architectural Assessment

The core concept is strong. It is small, coherent, and capable of supporting behavior that ordinary component composition does not naturally provide.

The architecture is interesting because it treats UI placement as data and makes rendering a projection. It is unusual because child presentation is intentionally delegated back to applications through outlets. It can be effective because this creates real composability rather than forcing every application into one global desktop scene.

The current implementation is not yet clean enough to expand indefinitely. Its conceptual structure is cleaner than its source structure. Naming is overloaded, lifecycle operations cross independent stores, prototype code remains beside active code, and applications currently reach too far into runtime internals.

The preproduction rewrite can be clean and expandable if it establishes a strict dependency direction, a small vocabulary, atomic lifecycle commands, explicit invariants, and one stable application-host protocol.

## Vocabulary for Preproduction

The rewrite should use these terms consistently:

- **Application type**: a registered kind of application and its React implementation.
- **Application instance**: a running identity of an application type. It does not contain application-owned state.
- **Surface**: a presentation of an application instance. A surface is generic and is not necessarily a desktop window.
- **Parent surface**: the surface whose application layout provides the outlet for an immediate child surface.
- **Workspace**: an ordered presentation context containing surfaces.
- **Shell**: the top-level interface that selects and composes a presentation adapter.
- **Presentation adapter**: the system that interprets a surface as a desktop window, mobile route, sheet, panel, or embedded view.
- **Surface outlet**: an application-selected location where immediate child surfaces are projected.
- **Host API**: the stable capabilities exposed to applications.
- **Root lifecycle callbacks**: optional consumer functions that receive initialization context and complete semantic runtime events without requiring a state adapter or connector component.
- **Hosted application state**: optional consumer-owned state carried by the application environment, keyed by application identity and opaque to the runtime core.
- **Runtime snapshot**: serializable application identity and surface relationship data, excluding application-owned state and React component functions.

The word **kernel** should be reserved for the headless runtime core if it remains useful at all. A visible inspector should be named as an inspector or developer tool, not as the kernel itself. The word **driver** should be used only for genuine adapters. React components that resolve or render data should be named renderers, views, outlets, or providers.

## Target Architecture

The package should have four directional layers.

### Functional core, imperative shell

The runtime manager should be organized around values and pure transformations. Commands are values, snapshots are values, transitions are values, selectors are pure functions, and each meaningful move should receive a descriptive variable name. Pure transition functions accept a snapshot and command and return the next snapshot, semantic event, and command result.

The live runtime still requires one stateful boundary so it can remember the current snapshot and notify subscribers. That mutation should be isolated inside a small dispatch shell. Lifecycle rules, graph operations, validation, and event construction should not be embedded in the mutable shell.

Consumers may use convenience methods such as `runtime.commands.launchApplication(input)` or create a named command value and pass it to `runtime.dispatch(command)`. Both paths must execute the same pure transition reducer.

### 1. Headless runtime core

The core owns application identity, surface identity, lifecycle, relationships, validation, and serializable snapshots. It must not import React or desktop components. It should expose atomic commands rather than exposing store mutation directly.

### 2. React runtime adapter

The React layer provides context, selectors, application resolution, surface outlets, error boundaries, host hooks, and root lifecycle callback delivery. It converts runtime records into React views but does not decide what a surface looks like or require a particular application-state abstraction.

### 3. Presentation adapters and shells

Desktop, mobile, and embedded adapters interpret generic surfaces. Desktop owns window geometry, stacking, minimizing, and pointer interaction. Mobile owns navigation and route presentation. A shell selects the adapter, provides root outlets, and adds interface elements such as taskbars or launchers.

### 4. Applications

Applications own business logic and state. They receive stable identity and host capabilities. They may declare surface outlets when they intentionally host child presentations. They do not mutate runtime stores directly.

Dependencies should only point downward through public contracts. Applications depend on the React host API, not on desktop internals. Presentation adapters depend on generic surface contracts, not on individual applications. The core depends on neither.

## Runtime Invariants

The preproduction runtime should enforce these rules centrally:

1. Every application instance has a globally unique identifier.
2. Every application instance refers to a registered application type before it is rendered.
3. Every surface has a globally unique identifier.
4. Every surface refers to an existing application instance.
5. Every non-root surface refers to an existing parent surface.
6. The surface graph cannot contain cycles.
7. Sibling ordering is deterministic.
8. Visibility is explicit and cannot be represented by contradictory lists.
9. Opening an application and its first surface is one atomic operation.
10. Closing a surface and closing an application are different operations.
11. Closing a surface does not destroy application-owned state unless the application lifecycle also ends.
12. Closing an application removes all of its surfaces and emits one lifecycle event.
13. Renderers are projections and do not repair invalid runtime state silently.
14. Consumer-owned application state may be hosted by the application environment, but the runtime core does not interpret it. The runtime snapshot remains limited to runtime records; consumers may serialize hosted application state separately.
15. React component functions live in the registry, not in the serializable runtime snapshot.
16. Root lifecycle callbacks receive complete event context, but runtime relationship mutations still occur through atomic public commands.

## Public API Direction

Applications should receive a narrow host API with commands such as launching an application, opening another surface for an existing application, focusing a surface, changing visibility, closing a surface, and closing an application.

The host API should accept semantic inputs and enforce invariants. Applications should not coordinate separate application and window stores themselves.

The React package should expose stable components and hooks such as a runtime provider, an application view, a generic surface outlet, a runtime host hook, and read-only selectors. Desktop-specific exports should live under an explicit desktop entry point.

The desktop environment root should also expose optional callback props such as `onInitialize` and `onRuntimeEvent`. They should pass through the complete public context and the relevant values from initialization and surface or application updates. They must not require consumers to implement another component, connector, or adapter. Callback consumers may host application state, hydrate external stores, persist data, log events, or integrate services without transferring ownership of state semantics to the runtime.

The first preproduction version does not need to solve every future use case. It does need to make invalid relationships difficult to create and to protect applications from internal store changes.

## Migration from the Prototype

The prototype should remain available as evidence of the experiments. The rewrite should be scaffolded beside it or on a dedicated branch rather than mechanically refactoring every experimental file.

### Phase 1: Freeze the model

Define the vocabulary, runtime records, commands, invariants, and lifecycle semantics. Decide precisely when an application exists independently of its surfaces.

### Phase 2: Build and test the headless core

Create one transactional runtime store for application and surface relationships. Test it without React. Cover launch, multiple surfaces, nested surfaces, focus ordering, visibility, moves, surface closure, application closure, and invalid graph operations.

### Phase 3: Add the React adapter

Implement the provider, registry, application resolver, host hook, generic surface outlet, and error boundaries. Verify that two surfaces can render one application identity while the application owns the shared state.

### Phase 4: Rebuild the desktop adapter

Adapt the existing `Window`, `AppWindowFrame`, taskbar controls, and immediate-child renderer to generic surfaces. Move position and sizing behavior behind the desktop presentation contract. Replace mouse-only behavior with pointer events and add keyboard and accessibility semantics.

### Phase 5: Prove presentation independence

Build one deliberately small second adapter, such as an embedded stack or mobile route renderer. It does not need polished UI. Its purpose is to prove that the core model is not secretly a desktop-only window model.

### Phase 6: Package preproduction

Publish explicit entry points, generated types, focused documentation, examples, invariant tests, and a migration example. Remove hard-coded application names and archive disconnected experiments outside the production source tree.

## Preproduction Acceptance Criteria

The architecture is ready for preproduction when all of the following are true:

- an application or consumer owns the meaning and lifecycle of its state, whether that state is external or optionally hosted by the application environment;
- one application instance can be shown through two surfaces;
- both surfaces can observe the same application-owned state when the application chooses to share it;
- a surface can close without necessarily closing its application;
- an application can close and atomically remove all of its surfaces;
- an application can intentionally place an outlet for immediate child surfaces;
- the same runtime snapshot can be projected through at least two presentation adapters;
- no application imports a raw runtime store or a desktop-specific renderer;
- consumers can receive initialization and complete runtime update information through optional root callbacks without implementing a required state adapter or connector component;
- no core module imports React;
- no root application, shell, or workspace identifier is hard-coded in the runtime;
- lifecycle commands preserve all runtime invariants;
- the headless core is covered by deterministic tests;
- package consumers can understand the model from the README and this document without reading prototype internals.

## What Not to Carry Forward

The preproduction rewrite should not carry forward accidental constraints merely because the prototype currently depends on them.

Do not require application IDs and surface IDs to match. Do not encode identity as JSON strings. Do not use separate non-transactional stores for records that must change together. Do not represent one state through both active and hidden collections. Do not make applications import store factories or controller hooks. Do not call UI renderers drivers. Do not make desktop geometry part of the generic runtime. Do not make application state a prerequisite for using the runtime. Do not require consumers to implement an adapter for a project-defined state adapter. Do not preserve dead experiments in the production module graph.

The prototype answered whether the idea could work. The next move is to make the idea legible, enforceable, testable, and suitable for other applications to build upon.

---

# Reference Scaffold

The following code is a proposed preproduction scaffold. TypeScript is used to make the contracts precise; the same boundaries can be implemented in JavaScript if necessary. These examples are a starting structure, not a claim that every API detail is final.

```text
src/
  core/
    types.ts
    createRuntime.ts
    selectors.ts
  react/
    RuntimeProvider.tsx
    ApplicationView.tsx
    SurfaceOutlet.tsx
    SurfaceRendererProvider.tsx
  presentations/
    desktop/
      DesktopShell.tsx
      DesktopSurface.tsx
      DesktopWindow.tsx
    embedded/
      EmbeddedShell.tsx
      EmbeddedSurface.tsx
  applications/
    inventory/
      InventoryApp.tsx
      inventoryState.ts
  index.ts
  desktop.ts
```

```ts
// src/core/types.ts
export type ApplicationTypeId = string;
export type ApplicationId = string;
export type SurfaceId = string;
export type WorkspaceId = string;

export type ApplicationLifecycle = "running" | "suspended";
export type SurfaceVisibility = "visible" | "hidden";

export interface ApplicationInstance {
  id: ApplicationId;
  typeId: ApplicationTypeId;
  lifecycle: ApplicationLifecycle;
  launchProps: Readonly<Record<string, unknown>>;
}

export interface SurfacePlacement {
  adapter: "desktop" | "mobile" | "embedded" | (string & {});
  region?: string;
  mode?: string;
  data?: Readonly<Record<string, unknown>>;
}

export interface Surface {
  id: SurfaceId;
  applicationId: ApplicationId;
  parentId: SurfaceId | null;
  workspaceId: WorkspaceId;
  order: number;
  visibility: SurfaceVisibility;
  placement: SurfacePlacement;
}

export interface RuntimeSnapshot {
  applications: Readonly<Record<ApplicationId, ApplicationInstance>>;
  surfaces: Readonly<Record<SurfaceId, Surface>>;
}

export type RuntimeEvent = {
  type: "application.closed";
  application: ApplicationInstance;
};

export interface LaunchApplicationInput {
  typeId: ApplicationTypeId;
  workspaceId: WorkspaceId;
  parentSurfaceId?: SurfaceId | null;
  launchProps?: Readonly<Record<string, unknown>>;
  placement: SurfacePlacement;
  applicationId?: ApplicationId;
  surfaceId?: SurfaceId;
}

export interface OpenSurfaceInput {
  applicationId: ApplicationId;
  workspaceId: WorkspaceId;
  parentSurfaceId?: SurfaceId | null;
  placement: SurfacePlacement;
  surfaceId?: SurfaceId;
}

export interface MoveSurfaceInput {
  parentSurfaceId: SurfaceId | null;
  workspaceId: WorkspaceId;
  placement?: SurfacePlacement;
}

export interface RuntimeCommands {
  launchApplication(input: LaunchApplicationInput): {
    applicationId: ApplicationId;
    surfaceId: SurfaceId;
  };
  openSurface(input: OpenSurfaceInput): SurfaceId;
  focusSurface(surfaceId: SurfaceId): void;
  setSurfaceVisibility(surfaceId: SurfaceId, visibility: SurfaceVisibility): void;
  updateSurfacePlacement(surfaceId: SurfaceId, placement: SurfacePlacement): void;
  moveSurface(surfaceId: SurfaceId, input: MoveSurfaceInput): void;
  closeSurface(surfaceId: SurfaceId): void;
  closeApplication(applicationId: ApplicationId): void;
}
```

```ts
// src/core/createRuntime.ts
import { createStore, type StoreApi } from "zustand/vanilla";
import type {
  ApplicationId,
  MoveSurfaceInput,
  OpenSurfaceInput,
  RuntimeCommands,
  RuntimeEvent,
  RuntimeSnapshot,
  SurfaceId,
} from "./types";

export interface Runtime {
  store: StoreApi<RuntimeSnapshot>;
  commands: RuntimeCommands;
  subscribe(listener: (event: RuntimeEvent) => void): () => void;
}

interface RuntimeOptions {
  initialSnapshot?: RuntimeSnapshot;
  createId?: (kind: "application" | "surface") => string;
  isApplicationTypeRegistered?: (typeId: string) => boolean;
}

const EMPTY_SNAPSHOT: RuntimeSnapshot = {
  applications: {},
  surfaces: {},
};

export function createRuntime(options: RuntimeOptions = {}): Runtime {
  const createId =
    options.createId ??
    ((kind) => `${kind}:${globalThis.crypto.randomUUID()}`);

  const store = createStore<RuntimeSnapshot>(() =>
    options.initialSnapshot ?? EMPTY_SNAPSHOT,
  );
  const listeners = new Set<(event: RuntimeEvent) => void>();
  const emit = (event: RuntimeEvent) => {
    for (const listener of listeners) listener(event);
  };

  const requireApplication = (applicationId: ApplicationId) => {
    const application = store.getState().applications[applicationId];
    if (!application) throw new Error(`Unknown application: ${applicationId}`);
    return application;
  };

  const requireSurface = (surfaceId: SurfaceId) => {
    const surface = store.getState().surfaces[surfaceId];
    if (!surface) throw new Error(`Unknown surface: ${surfaceId}`);
    return surface;
  };

  const requireParent = (parentId: SurfaceId | null) => {
    if (parentId !== null) requireSurface(parentId);
  };

  const nextSiblingOrder = (
    snapshot: RuntimeSnapshot,
    parentId: SurfaceId | null,
    workspaceId: string,
  ) =>
    Math.max(
      -1,
      ...Object.values(snapshot.surfaces)
        .filter(
          (surface) =>
            surface.parentId === parentId &&
            surface.workspaceId === workspaceId,
        )
        .map((surface) => surface.order),
    ) + 1;

  const collectSurfaceTree = (
    snapshot: RuntimeSnapshot,
    rootId: SurfaceId,
  ): Set<SurfaceId> => {
    const ids = new Set<SurfaceId>([rootId]);
    let changed = true;

    while (changed) {
      changed = false;
      for (const surface of Object.values(snapshot.surfaces)) {
        if (surface.parentId && ids.has(surface.parentId) && !ids.has(surface.id)) {
          ids.add(surface.id);
          changed = true;
        }
      }
    }

    return ids;
  };

  const openSurface = (input: OpenSurfaceInput): SurfaceId => {
    requireApplication(input.applicationId);
    const parentId = input.parentSurfaceId ?? null;
    requireParent(parentId);

    const surfaceId = input.surfaceId ?? createId("surface");
    const snapshot = store.getState();
    if (snapshot.surfaces[surfaceId]) {
      throw new Error(`Duplicate surface: ${surfaceId}`);
    }

    store.setState({
      ...snapshot,
      surfaces: {
        ...snapshot.surfaces,
        [surfaceId]: {
          id: surfaceId,
          applicationId: input.applicationId,
          parentId,
          workspaceId: input.workspaceId,
          order: nextSiblingOrder(snapshot, parentId, input.workspaceId),
          visibility: "visible",
          placement: input.placement,
        },
      },
    });

    return surfaceId;
  };

  const commands: RuntimeCommands = {
    launchApplication(input) {
      if (
        options.isApplicationTypeRegistered &&
        !options.isApplicationTypeRegistered(input.typeId)
      ) {
        throw new Error(`Unregistered application type: ${input.typeId}`);
      }

      const snapshot = store.getState();
      const applicationId = input.applicationId ?? createId("application");
      const surfaceId = input.surfaceId ?? createId("surface");
      const parentId = input.parentSurfaceId ?? null;

      if (snapshot.applications[applicationId]) {
        throw new Error(`Duplicate application: ${applicationId}`);
      }
      if (snapshot.surfaces[surfaceId]) {
        throw new Error(`Duplicate surface: ${surfaceId}`);
      }
      requireParent(parentId);

      // Application creation and first-surface creation are one transaction.
      store.setState({
        applications: {
          ...snapshot.applications,
          [applicationId]: {
            id: applicationId,
            typeId: input.typeId,
            lifecycle: "running",
            launchProps: input.launchProps ?? {},
          },
        },
        surfaces: {
          ...snapshot.surfaces,
          [surfaceId]: {
            id: surfaceId,
            applicationId,
            parentId,
            workspaceId: input.workspaceId,
            order: nextSiblingOrder(snapshot, parentId, input.workspaceId),
            visibility: "visible",
            placement: input.placement,
          },
        },
      });

      return { applicationId, surfaceId };
    },

    openSurface,

    focusSurface(surfaceId) {
      const surface = requireSurface(surfaceId);
      const snapshot = store.getState();
      const order = nextSiblingOrder(
        snapshot,
        surface.parentId,
        surface.workspaceId,
      );

      store.setState({
        ...snapshot,
        surfaces: {
          ...snapshot.surfaces,
          [surfaceId]: { ...surface, order, visibility: "visible" },
        },
      });
    },

    setSurfaceVisibility(surfaceId, visibility) {
      const surface = requireSurface(surfaceId);
      const snapshot = store.getState();
      store.setState({
        ...snapshot,
        surfaces: {
          ...snapshot.surfaces,
          [surfaceId]: { ...surface, visibility },
        },
      });
    },

    updateSurfacePlacement(surfaceId, placement) {
      const surface = requireSurface(surfaceId);
      const snapshot = store.getState();
      store.setState({
        ...snapshot,
        surfaces: {
          ...snapshot.surfaces,
          [surfaceId]: { ...surface, placement },
        },
      });
    },

    moveSurface(surfaceId, input: MoveSurfaceInput) {
      const surface = requireSurface(surfaceId);
      const parentId = input.parentSurfaceId;
      requireParent(parentId);

      const snapshot = store.getState();
      const ownTree = collectSurfaceTree(snapshot, surfaceId);
      if (parentId !== null && ownTree.has(parentId)) {
        throw new Error(`Moving ${surfaceId} would create a surface cycle`);
      }

      store.setState({
        ...snapshot,
        surfaces: {
          ...snapshot.surfaces,
          [surfaceId]: {
            ...surface,
            parentId,
            workspaceId: input.workspaceId,
            order: nextSiblingOrder(snapshot, parentId, input.workspaceId),
            placement: input.placement ?? surface.placement,
          },
        },
      });
    },

    closeSurface(surfaceId) {
      requireSurface(surfaceId);
      const snapshot = store.getState();
      const removedIds = collectSurfaceTree(snapshot, surfaceId);
      const surfaces = Object.fromEntries(
        Object.entries(snapshot.surfaces).filter(([id]) => !removedIds.has(id)),
      );
      store.setState({ ...snapshot, surfaces });
    },

    closeApplication(applicationId) {
      const application = requireApplication(applicationId);
      const snapshot = store.getState();
      const applications = Object.fromEntries(
        Object.entries(snapshot.applications).filter(
          ([id]) => id !== applicationId,
        ),
      );
      const removedSurfaceIds = new Set<SurfaceId>();

      for (const surface of Object.values(snapshot.surfaces)) {
        if (surface.applicationId !== applicationId) continue;
        for (const id of collectSurfaceTree(snapshot, surface.id)) {
          removedSurfaceIds.add(id);
        }
      }

      const surfaces = Object.fromEntries(
        Object.entries(snapshot.surfaces).filter(
          ([surfaceId]) => !removedSurfaceIds.has(surfaceId),
        ),
      );
      store.setState({ applications, surfaces });
      emit({ type: "application.closed", application });
    },
  };

  return {
    store,
    commands,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
```

```ts
// src/core/selectors.ts
import type { RuntimeSnapshot, SurfaceId, WorkspaceId } from "./types";

export const selectApplication = (applicationId: string) =>
  (snapshot: RuntimeSnapshot) => snapshot.applications[applicationId];

export const selectSurface = (surfaceId: SurfaceId) =>
  (snapshot: RuntimeSnapshot) => snapshot.surfaces[surfaceId];

export const selectChildSurfaceIds = (
  parentId: SurfaceId | null,
  workspaceId: WorkspaceId,
  adapterId: string,
) =>
  (snapshot: RuntimeSnapshot) =>
    Object.values(snapshot.surfaces)
      .filter(
        (surface) =>
          surface.parentId === parentId &&
          surface.workspaceId === workspaceId &&
          surface.placement.adapter === adapterId,
      )
      .sort((a, b) => a.order - b.order)
      .map((surface) => surface.id);
```

```tsx
// src/react/RuntimeProvider.tsx
import {
  createContext,
  useContext,
  type ComponentType,
  type ReactNode,
} from "react";
import { useStore } from "zustand";
import type { Runtime } from "../core/createRuntime";
import type {
  ApplicationId,
  ApplicationTypeId,
  LaunchApplicationInput,
  OpenSurfaceInput,
  RuntimeCommands,
  RuntimeSnapshot,
  SurfaceId,
  SurfaceVisibility,
} from "../core/types";

export interface ApplicationHost {
  applicationId: ApplicationId;
  surfaceId: SurfaceId;
  launchChild(
    input: Omit<LaunchApplicationInput, "parentSurfaceId">,
  ): ReturnType<RuntimeCommands["launchApplication"]>;
  openOwnSurface(
    input: Omit<OpenSurfaceInput, "applicationId">,
  ): SurfaceId;
  focusSelf(): void;
  setSelfVisibility(visibility: SurfaceVisibility): void;
  closeSelfSurface(): void;
  closeSelfApplication(): void;
}

export interface ApplicationViewProps {
  applicationId: ApplicationId;
  surfaceId: SurfaceId;
  launchProps: Readonly<Record<string, unknown>>;
  host: ApplicationHost;
}

export interface ApplicationDefinition {
  Component: ComponentType<ApplicationViewProps>;
}

export type ApplicationRegistry = Readonly<
  Record<ApplicationTypeId, ApplicationDefinition>
>;

interface RuntimeContextValue {
  runtime: Runtime;
  registry: ApplicationRegistry;
}

const RuntimeContext = createContext<RuntimeContextValue | null>(null);

export function RuntimeProvider({
  runtime,
  registry,
  children,
}: RuntimeContextValue & { children: ReactNode }) {
  return (
    <RuntimeContext.Provider value={{ runtime, registry }}>
      {children}
    </RuntimeContext.Provider>
  );
}

export function useRuntime() {
  const value = useContext(RuntimeContext);
  if (!value) throw new Error("RuntimeProvider is missing");
  return value;
}

export function useRuntimeCommands() {
  return useRuntime().runtime.commands;
}

export function createApplicationHost(
  commands: RuntimeCommands,
  applicationId: ApplicationId,
  surfaceId: SurfaceId,
): ApplicationHost {
  return {
    applicationId,
    surfaceId,
    launchChild: (input) =>
      commands.launchApplication({ ...input, parentSurfaceId: surfaceId }),
    openOwnSurface: (input) =>
      commands.openSurface({ ...input, applicationId }),
    focusSelf: () => commands.focusSurface(surfaceId),
    setSelfVisibility: (visibility) =>
      commands.setSurfaceVisibility(surfaceId, visibility),
    closeSelfSurface: () => commands.closeSurface(surfaceId),
    closeSelfApplication: () => commands.closeApplication(applicationId),
  };
}

export function useRuntimeSelector<T>(
  selector: (snapshot: RuntimeSnapshot) => T,
) {
  return useStore(useRuntime().runtime.store, selector);
}
```

```tsx
// src/react/ApplicationView.tsx
import { selectApplication, selectSurface } from "../core/selectors";
import {
  createApplicationHost,
  useRuntime,
  useRuntimeSelector,
} from "./RuntimeProvider";

export function ApplicationView({ surfaceId }: { surfaceId: string }) {
  const { registry, runtime } = useRuntime();
  const surface = useRuntimeSelector(selectSurface(surfaceId));
  const application = useRuntimeSelector(
    selectApplication(surface?.applicationId ?? "missing"),
  );

  if (!surface) throw new Error(`Unknown surface: ${surfaceId}`);

  if (!application) {
    throw new Error(`Surface ${surfaceId} has no application`);
  }

  const definition = registry[application.typeId];
  if (!definition) {
    throw new Error(`Unregistered application type: ${application.typeId}`);
  }

  const Component = definition.Component;
  const host = createApplicationHost(
    runtime.commands,
    application.id,
    surface.id,
  );

  return (
    <Component
      applicationId={application.id}
      surfaceId={surface.id}
      launchProps={application.launchProps}
      host={host}
    />
  );
}
```

```tsx
// src/react/SurfaceRendererProvider.tsx
import {
  createContext,
  useContext,
  type ComponentType,
  type ReactNode,
} from "react";

export interface SurfaceRendererProps {
  surfaceId: string;
}

export type SurfaceRenderer = ComponentType<SurfaceRendererProps>;

interface SurfaceRendererContextValue {
  adapterId: string;
  renderer: SurfaceRenderer;
}

const SurfaceRendererContext =
  createContext<SurfaceRendererContextValue | null>(null);

export function SurfaceRendererProvider({
  adapterId,
  renderer,
  children,
}: {
  adapterId: string;
  renderer: SurfaceRenderer;
  children: ReactNode;
}) {
  return (
    <SurfaceRendererContext.Provider value={{ adapterId, renderer }}>
      {children}
    </SurfaceRendererContext.Provider>
  );
}

export function useSurfaceRenderer() {
  const value = useContext(SurfaceRendererContext);
  if (!value) throw new Error("SurfaceRendererProvider is missing");
  return value;
}
```

```tsx
// src/react/SurfaceOutlet.tsx
import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { selectChildSurfaceIds } from "../core/selectors";
import { useRuntimeSelector } from "./RuntimeProvider";
import { useSurfaceRenderer } from "./SurfaceRendererProvider";

export function SurfaceOutlet({
  parentSurfaceId,
  workspaceId,
}: {
  parentSurfaceId: string | null;
  workspaceId: string;
}) {
  const { adapterId, renderer: Renderer } = useSurfaceRenderer();
  const selector = useMemo(
    () => selectChildSurfaceIds(parentSurfaceId, workspaceId, adapterId),
    [adapterId, parentSurfaceId, workspaceId],
  );
  const childIds = useRuntimeSelector(useShallow(selector));

  return childIds.map((surfaceId) => (
    <Renderer key={surfaceId} surfaceId={surfaceId} />
  ));
}
```

```tsx
// src/presentations/desktop/DesktopSurface.tsx
import { selectSurface } from "../../core/selectors";
import { ApplicationView } from "../../react/ApplicationView";
import {
  useRuntimeCommands,
  useRuntimeSelector,
} from "../../react/RuntimeProvider";
import { DesktopWindow } from "./DesktopWindow";

interface DesktopPlacementData {
  title?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export function DesktopSurface({ surfaceId }: { surfaceId: string }) {
  const surface = useRuntimeSelector(selectSurface(surfaceId));
  const commands = useRuntimeCommands();

  if (!surface) return null;

  const desktop = (surface.placement.data ?? {}) as DesktopPlacementData;

  return (
    <DesktopWindow
      title={desktop.title ?? surface.applicationId}
      hidden={surface.visibility === "hidden"}
      order={surface.order}
      placement={desktop}
      onFocus={() => commands.focusSurface(surface.id)}
      onMinimize={() => commands.setSurfaceVisibility(surface.id, "hidden")}
      onClose={() => commands.closeSurface(surface.id)}
      onPlacementChange={(data) =>
        commands.updateSurfacePlacement(surface.id, {
          ...surface.placement,
          adapter: "desktop",
          data,
        })
      }
    >
      <ApplicationView surfaceId={surface.id} />
    </DesktopWindow>
  );
}
```

```tsx
// src/presentations/desktop/DesktopShell.tsx
import { SurfaceOutlet } from "../../react/SurfaceOutlet";
import { SurfaceRendererProvider } from "../../react/SurfaceRendererProvider";
import { DesktopSurface } from "./DesktopSurface";

export function DesktopShell({ workspaceId }: { workspaceId: string }) {
  return (
    <SurfaceRendererProvider adapterId="desktop" renderer={DesktopSurface}>
      <main className="desktop-shell">
        <SurfaceOutlet parentSurfaceId={null} workspaceId={workspaceId} />
      </main>
    </SurfaceRendererProvider>
  );
}
```

```tsx
// An application intentionally chooses where immediate child surfaces appear.
// It imports the generic outlet, not the desktop window renderer.
import { SurfaceOutlet } from "../../react/SurfaceOutlet";
import type { ApplicationViewProps } from "../../react/RuntimeProvider";

export function WorkspaceApplication({
  surfaceId,
  launchProps,
}: ApplicationViewProps) {
  const workspaceId = String(launchProps.workspaceId ?? "main");

  return (
    <section className="workspace-application">
      <header>Workspace</header>
      <div className="workspace-content">
        <SurfaceOutlet
          parentSurfaceId={surfaceId}
          workspaceId={workspaceId}
        />
      </div>
    </section>
  );
}
```

```ts
// src/applications/inventory/inventoryState.ts
// The application owns this state. The runtime only supplies applicationId.
import { createStore, type StoreApi } from "zustand/vanilla";

interface InventoryState {
  items: string[];
  addItem(item: string): void;
}

const stores = new Map<string, StoreApi<InventoryState>>();

export function getInventoryState(applicationId: string) {
  let store = stores.get(applicationId);

  if (!store) {
    store = createStore<InventoryState>((set) => ({
      items: [],
      addItem: (item) =>
        set((state) => ({ items: [...state.items, item] })),
    }));
    stores.set(applicationId, store);
  }

  return store;
}

export function disposeInventoryState(applicationId: string) {
  stores.delete(applicationId);
}
```

```tsx
// src/applications/inventory/InventoryApp.tsx
// Two surfaces with the same applicationId observe the same app-owned store.
import { useMemo } from "react";
import { useStore } from "zustand";
import type { ApplicationViewProps } from "../../react/RuntimeProvider";
import { getInventoryState } from "./inventoryState";

export function InventoryApp({ applicationId }: ApplicationViewProps) {
  const store = useMemo(
    () => getInventoryState(applicationId),
    [applicationId],
  );
  const items = useStore(store, (state) => state.items);
  const addItem = useStore(store, (state) => state.addItem);

  return (
    <section>
      <button onClick={() => addItem(`Item ${items.length + 1}`)}>
        Add item
      </button>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
```

```ts
// Application-owned lifecycle integration during composition/bootstrap.
// The runtime emits identity events but never reads or mutates Inventory state.
import type { Runtime } from "./core/createRuntime";
import { disposeInventoryState } from "./applications/inventory/inventoryState";

export function connectInventoryLifecycle(runtime: Runtime) {
  return runtime.subscribe((event) => {
    if (
      event.type === "application.closed" &&
      event.application.typeId === "inventory"
    ) {
      disposeInventoryState(event.application.id);
    }
  });
}
```

```ts
// src/index.ts — generic runtime entry point
export { createRuntime } from "./core/createRuntime";
export type * from "./core/types";
export { RuntimeProvider, useRuntimeSelector } from "./react/RuntimeProvider";
export type {
  ApplicationDefinition,
  ApplicationHost,
  ApplicationRegistry,
  ApplicationViewProps,
} from "./react/RuntimeProvider";
export { ApplicationView } from "./react/ApplicationView";
export { SurfaceOutlet } from "./react/SurfaceOutlet";
export { SurfaceRendererProvider } from "./react/SurfaceRendererProvider";
```

```ts
// src/desktop.ts — explicitly desktop-specific entry point
export { DesktopShell } from "./presentations/desktop/DesktopShell";
export { DesktopSurface } from "./presentations/desktop/DesktopSurface";
export { DesktopWindow } from "./presentations/desktop/DesktopWindow";
```

```ts
// src/core/createRuntime.test.ts
import { describe, expect, it } from "vitest";
import { createRuntime } from "./createRuntime";

describe("runtime relationships", () => {
  it("creates an application and its first surface atomically", () => {
    const runtime = createRuntime({
      createId: (kind) => `${kind}:1`,
      isApplicationTypeRegistered: (typeId) => typeId === "inventory",
    });

    const result = runtime.commands.launchApplication({
      typeId: "inventory",
      workspaceId: "main",
      placement: { adapter: "desktop" },
    });

    const snapshot = runtime.store.getState();
    expect(snapshot.applications[result.applicationId]).toBeDefined();
    expect(snapshot.surfaces[result.surfaceId].applicationId).toBe(
      result.applicationId,
    );
  });

  it("allows several surfaces to present one application", () => {
    let sequence = 0;
    const runtime = createRuntime({
      createId: (kind) => `${kind}:${++sequence}`,
    });

    const { applicationId, surfaceId: firstSurfaceId } =
      runtime.commands.launchApplication({
        typeId: "inventory",
        workspaceId: "main",
        placement: { adapter: "desktop" },
      });

    const secondSurfaceId = runtime.commands.openSurface({
      applicationId,
      workspaceId: "mobile",
      placement: { adapter: "mobile" },
    });

    const snapshot = runtime.store.getState();
    expect(snapshot.surfaces[firstSurfaceId].applicationId).toBe(applicationId);
    expect(snapshot.surfaces[secondSurfaceId].applicationId).toBe(applicationId);
  });

  it("closes a surface without closing its application", () => {
    let sequence = 0;
    const runtime = createRuntime({
      createId: (kind) => `${kind}:${++sequence}`,
    });

    const { applicationId, surfaceId } =
      runtime.commands.launchApplication({
        typeId: "inventory",
        workspaceId: "main",
        placement: { adapter: "desktop" },
      });

    runtime.commands.closeSurface(surfaceId);

    const snapshot = runtime.store.getState();
    expect(snapshot.surfaces[surfaceId]).toBeUndefined();
    expect(snapshot.applications[applicationId]).toBeDefined();
  });

  it("rejects a move that would create a surface cycle", () => {
    let sequence = 0;
    const runtime = createRuntime({
      createId: (kind) => `${kind}:${++sequence}`,
    });

    const { surfaceId: parentId } = runtime.commands.launchApplication({
      typeId: "workspace",
      workspaceId: "main",
      placement: { adapter: "desktop" },
    });
    const { surfaceId: childId } = runtime.commands.launchApplication({
      typeId: "inventory",
      workspaceId: "main",
      parentSurfaceId: parentId,
      placement: { adapter: "desktop" },
    });

    expect(() =>
      runtime.commands.moveSurface(parentId, {
        parentSurfaceId: childId,
        workspaceId: "main",
      }),
    ).toThrow(/surface cycle/);
  });
});
```
