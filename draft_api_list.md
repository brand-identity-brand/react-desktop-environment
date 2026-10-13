# Draft API list

This document explains the current public interfaces for the Window and Surface
primitives, AppletEngine, and stock UI. The linked owning documents describe
their governing contracts; this list describes how consumers reach them.

| Layer | Responsibility | When to use it |
| --- | --- | --- |
| Window manager and compositor | Window identity and parentage; Applications and Surface presentation records | Build custom behavior from the primitives |
| AppletEngine | Standard Applet behavior, occurrence identity, state, Decks, themes, and checkpoints | Use Applet conventions with stock or custom presentation |
| Stock UI | Frames, controls, DOM allocation, and pointer interaction | Start with an interactive wireframe, then replace its appearance |

Workspace and Deck presentations are peer hosts. Consumers choose their
hierarchy. Replacing appearance does not require replacing Applet behavior.

The layer called `surfaceStates` in discussion is currently exposed through
the window-manager and compositor entries. There is no import named
`surfaceStates`. Live Surface records are available through
`compositor.getSnapshot().surfaces`; `surfaceState[]` is the AppletEngine
checkpoint format.

## Window manager and compositor

The Window manager owns Window identity, parent relationships, and lifecycle.
The compositor connects Windows, Applications, and their Surface records.
See the [package contract](packages/react-desktop-environment/README.md).

| Import | Export | Purpose |
| --- | --- | --- |
| `react-desktop-environment/window-manager` | `createWindowManager(options)` | Construct the Window store |
| `react-desktop-environment/compositor` | `createCompositor(options)` | Construct the Application and Surface store |
| Same | `SurfaceComposer` | Recursively render registered Applications inside registered Surface frames |

The returned objects expose:

| Owner | Methods |
| --- | --- |
| `manager.window` | `create`, `add`, `read`, `readChildren`, `move`, `remove` |
| `manager` | `getSnapshot`, `subscribe` |
| `compositor.application` | `create`, `add`, `read`, `update`, `remove`, `getComponent` |
| `compositor.surface` | `create`, `add`, `read`, `readChildren`, `readSelectedChild`, `selectChild`, `activateChild`, `raiseChild`, `update`, `raise`, `readControls`, `remove`, `getComponent` |
| `compositor` | `getSnapshot`, `subscribe`, `cleanup`, `destroy` |

Creating a record and inserting it into its store are separate operations.
Window movement changes parentage. Surface movement changes presentation
position. A Surface links one Window and one Application without replacing
either identity.

`compositor.surface.readControls({ surfaceId })` supplies these controls:

```js
focus()
hide()
show()
move({ position })
resize({ position, size })
fullscreen({ position, size })
exitFullscreen()
selectChild(childSurfaceId)
close()
```

The constructor's `configureSurfaceControls({ controls, surfaceId })` option
lets a consumer supply or replace controls. The compositor also exposes its
`windowManager`, `applicationRegistry`, and `surfaceComponentRegistry`.

`SurfaceComposer` accepts `compositor`, `surfaceId`, optional
`applicationContext`, and `children`. It renders the immediate child Surfaces
and recursively enters their descendants. Surface frames receive the structural
`surface`, `window`, `application`, and `controls` records plus composed
children. The Applet runtime's
[composition contract](packages/react-desktop-environment/src/applet-engine/README.md#composition-material)
explains tree-driven rendering and its distinction from directly authored
composition.

React bindings come from
`react-desktop-environment/window-manager/react`:

| Kind | Exports |
| --- | --- |
| Providers | `WindowManagerProvider`, `WindowProvider` |
| Store access | `useWindowManager`, `useWindowManagerSnapshot`, `useWindowManagerSelector` |
| Window access | `useWindow`, `useCurrentWindow`, `useCurrentWindowId`, `useParentWindow`, `useChildWindows`, `useRootWindows` |
| Bound operations | `useWindowController` |

`WindowManagerProvider` takes `manager`; `WindowProvider` takes `windowId`.
`useWindowController()` returns the current Window, its parent and children,
and the bound `create`, `add`, `move`, and `remove` operations.

## AppletEngine

Import from `react-desktop-environment/applet-engine`.
This layer owns registered definitions, occurrences, named state, stack
selection, Deck behavior, themes, and checkpoints. See the
[Applet runtime contract](packages/react-desktop-environment/src/applet-engine/README.md).

| API | Purpose |
| --- | --- |
| `AppletEngine` | React runtime provider |
| `AppletEngine.create(options)` | Construct a runtime directly |
| `createAppletEngine(Applet, { composition })` | Bind the runtime to an Applet definition |
| `AppletEnvironment` / `.use()` | Supply/read the desktop environment |
| `AppletEngine.Application` | Supply an Application context |
| `AppletEngine.use()` / `.useOptional()` | Read the current runtime |
| `.useApplication()` | Read the current Application |
| `.useWhichApplet(...)` | Resolve occurrence records for an existing direct composition owner |
| `.useState(initialValue, name, options)` | Declare named Application state |
| `.useOwnership()` | Read whether this Applet binding owns the runtime |
| `.useRootApplet(...)` / `.resolveRootApplet(...)` | Resolve root material |
| `.collectApplicationRegistry(...)` | Register the definition tree |
| `.collectSettingsContributions(...)` | Find registered Settings contributions |

`createAppletEngine` returns a React binding; `AppletEngine.create` returns a
runtime object. The binding also exposes `.Applet` and `.Runtime`, plus the
same static operations and hooks. `appletEngineApi` exports the binding's
member-name list.

The registry registers the Applet itself. That component receives its
Application and Surface as props and reads the engine from context.
`SurfaceComposer` supplies those records; its Applets do not call
`useWhichApplet`. A standalone host supplies records beneath the existing
`AppletEngine` provider. The provider owns engine creation, reset, theme
observation, disposal, and `onEngine`. The
[entry contract](packages/react-desktop-environment/src/applet-engine/README.md#definitions-and-ownership)
owns these mounting rules.

`useWhichApplet` and `useAppletState` are available as direct exports.
An existing direct composition owner calls `useWhichApplet` when it lacks
occurrence records. The hook returns `{ application, engine, surface }`, using
a supplied `engine` or the current engine context, and supplies a missing
anchor. The owner then passes the records to its Applet. The mounting choice
follows whether the composition is authored directly or rendered from the
runtime tree, rather than whether the user can create or remove the Applet.
Named state returns `[value, setValue]`; its options include `persistent` and
`adopt` for adopting recognized saved values.

The runtime constructor accepts `applet`, `desktopEnvironment`, `composition`,
`options`, `rootApplet`, and `scheme`. The desktop environment supplies
`windowManager.createWindowManager`, `compositor.createCompositor`, and
optional `ui.Window` material. `options.initialState` supplies a checkpoint;
`options.cleanState` supplies its independently tracked saved baseline.

The React provider can receive an existing `engine`; its `onEngine` callback
receives the active runtime. An injected runtime remains the injector's
responsibility to destroy. Nested bindings otherwise reuse the existing
runtime.

### Runtime operations

| Owner | Methods |
| --- | --- |
| `engine.runtime` — definitions | `resolveApplicationNode`, `applicationForNode`, `childApplication` |
| Same — occurrences | `createApplicationInstance`, `retainApplicationInstance`, `ensureAnchorSurface`, `createReferenceSurface` |
| Same — selection | `readChildStack`, `readSelectedChild`, `selectChild`, `selectionSupply` |
| Same — Workspace activation | `activeWorkspaceSurface`, `activateWorkspaceSurface` |
| Same — presentation queries | `presentedSurface`, `isDeckSurface`, `surfacePlacementOwnerId` |
| Same — transfer | `beginPeel`, `mergeDeck` |
| Same — themes | `themeFor`, `getScheme`, `setScheme`, `subscribeTheme` |
| `engine.checkpoint` | `getSnapshot`, `subscribe`, `capture`, `release`, `markClean`, `isDirty`, `matches`; `reset` when the runtime provides reset |
| `engine` | `destroy` |

Selection promotes a child to the top of its owner's stack. Removing the top
reveals the next surviving child. The engine supplies that behavior to every
presentation through the same operations.

`beginPeel(...)` returns `movingSurfaceId`, `frameSurfaceId`, `cancel()`,
`retain({ geometry })`, and `remove()`. It owns the occurrence transfer and its
rollback; UI owns pointer tracking and rendering. `mergeDeck(...)` transfers
members into an admitting Deck and removes the emptied source anchor.

Checkpoint capture returns an exact submitted snapshot. `markClean(capture)`
marks that capture saved, and `release(capture)` releases it. Checkpoint state
does not store live callbacks, requests, or UI resources.

The engine also exposes `applicationRegistry`, `applicationInstances`,
`surfaceComponentRegistry`, `compositor`, `windowManager`, `composition`,
`desktopEnvironment`, `rootApplet`, `rootApplicationId`, `rootSurfaceId`, and
`rootWindowId`.

### Composition, state, and themes

| Subject | Public exports |
| --- | --- |
| Deck | `Deck`, `useDeckComposition`, `resolveDeckProps` |
| Child composition | `useChildSurfaceComposition` |
| Presentation dimensions | `minimumPresentationSize`, `constrainPresentationSize` |
| State construction/validation | `createAppletStateStore`, `immutableJson`, `validateSurfaceState` |
| State contexts | `AppletApplicationContext`, `AppletStateStoreContext` |
| Theme construction | `createAppletTheme`, `resolveAppletTheme`, `DEFAULT_APPLET_THEME` |
| Theme React bindings | `AppletThemeProvider`, `useAppletTheme`, `useAppletThemeRoot`, `AppletThemeContext`, `AppletThemeRootContext` |

`useChildSurfaceComposition(...)` returns `childSurfaces`, `childSurfaceIds`,
`selectedSurfaceId`, and `selectSurface`. Its optional `fullscreen` filter
distinguishes mounted and floating presentations.

`useDeckComposition(...)` supplies the child composition, resident slots,
`addable`, `unmountable`, `menuOpen`, and `onMenuOpenChange`. `Deck` passes this
model to the supplied `DeckSurface` material. Its `Surface`, `Bar`,
`Presentation`, `Placeholder`, `Spine`, and `Switch` parts expose that material;
`Switch.Bar` and `Switch.Inline` are also available.

Direct state-store consumers can use `engine.appletState`:
`addApplication`, `removeApplication`, `endApplicationState`, `ensure`, `read`,
`write`, `getSetter`, `snapshot`, `cleanSnapshot`, `replaceCleanState`,
`subscribe`, and `subscribeCheckpoint`. Ordinary Applets declare state with
`AppletEngine.useState`.

## Stock UI

There are two separate entries. See the
[stock Applet UI contract](packages/react-desktop-environment/src/ui/applet/README.md).

| Import | Export | Purpose |
| --- | --- | --- |
| `react-desktop-environment/ui` | `Window` | Basic draggable Window frame with supplied controls |
| `react-desktop-environment/ui/applet` | `AppletSurface` | Stock Applet frame using the engine's records and operations |
| Same | `appletComposition` | Ready-made stock UI composition |

`Window` accepts `surface`, `window`, `application`, `controls`, `children`,
`title`, `hidden`, `draggable`, `actions`, `className`, `style`, `contentStyle`,
and `onPointerDown`. Additional DOM props reach its outer element.

`AppletSurface` accepts `surface`, `children`, and `style`.

`appletComposition` supplies three replaceable slots:

```js
{
  ReferenceSurface,
  Provider,
  DeckSurface,
}
```

The stock frames offer Applet switching, Deck menus, closing, floating movement
and resizing, and fullscreen/restore controls. They invoke engine operations;
they do not maintain a separate occurrence tree or selection model.

The engine's complete composition contract accepts:

```js
{
  ReferenceSurface,
  Provider,
  Boundary,
  ThemeProvider,
  defaultTheme,
  DeckSurface,
  rootDefaults: { Record, Tab },
}
```

| Slot | Purpose |
| --- | --- |
| `ReferenceSurface` | Frame for registered reference placements |
| `Provider` | Wrap runtime content with presentation context |
| `Boundary` | Establish a definition binding's presentation boundary |
| `ThemeProvider` | Add consumer theme context while retaining the canonical theme context |
| `defaultTheme` | Supply fallback theme material |
| `DeckSurface` | Render the engine's Deck model |
| `rootDefaults` | Supply absent root material without replacing declared material |

Start with `appletComposition`, then replace its material for a custom look.
Applet behavior continues to belong to the engine. Consumers defining different
behavior use the underlying Window and Surface primitives.

## Package entry boundaries

The package root exports `Button`, the window-manager exports, and
`createCompositor`, `SurfaceComposer`, `MAIN_API`, `SCHEMA`, and
`WHAT_IS_WORKSPACE`. It does not re-export AppletEngine or stock Applet UI.
Those use their explicit import paths above.

The entries also expose descriptive strings: `INFO` from window-manager;
`ABSTRACTION`, `WHAT_IS_WORKSPACE`, `SCHEMA`, and `MAIN_API` from compositor;
and `ABSTRACTION` from applet-engine and basic UI. These describe the API and
are not runtime operations.

Checkpoint storage has separate entries, outside the three interfaces covered
here: [storage-neutral persistence](packages/react-desktop-environment/src/applet-persistence/README.md)
and its [IndexedDB adapter](packages/react-desktop-environment/src/applet-persistence/indexed-db/README.md).
