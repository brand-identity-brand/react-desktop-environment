# Applet runtime

An Applet recursively declares available application definitions. AppletEngine
raises one definition tree into Applications, Windows, Surfaces, named
Application state, resident Decks, and complete checkpoints. Its replaceable
composition material supplies presentation without changing runtime ownership.

## Public entry

```js
import {
  AppletEngine,
  AppletEnvironment,
  createAppletEngine,
} from 'react-desktop-environment/applet-engine'
```

The entry also exports `Deck`, `useDeckComposition`,
`useChildSurfaceComposition`, `AppletApplicationContext`,
`AppletStateStoreContext`, `createAppletStateStore`, `immutableJson`,
`validateSurfaceState`, `useAppletState`, and generic theme contracts described
below. All bindings use one canonical set of contexts and the consumer's React.

`createAppletEngine(Applet, { composition })` creates a definition-local React
binding. Its `.Applet` names that definition and `.Runtime` is the canonical
`AppletEngine`. It exposes the same construction, registry, state, and context
operations; the binder supplies the definition's default desktop environment.
Nested bindings inherit the existing engine and environment.

## Definitions and ownership

An Applet function declares `meta.applicationName` and a plain `applets` object
containing only its direct child definitions. The local registry key must
match the child's lowercase kebab-case application name. Registration is
recursive and immutable; cycles and conflicting identities are rejected.
Definitions may publish `Surface`, `Bar`, `Presentation`, `Placeholder`,
`Spine`, and `Switch` material. Their local visual composition remains theirs.

An optional `.Settings` is the exact registered `applets.settings` definition.
`collectSettingsContributions(registry, ownerNodes)` inspects only the immediate
children of the exact supplied containers and returns registered contribution
nodes. Discovery neither creates occurrences nor maintains another registry.

`AppletEngine.create({ applet, desktopEnvironment, composition, options,
rootApplet, scheme })` constructs a runtime. The environment supplies the public
window-manager and compositor factories and optional default Window material.
The engine registers its `deck` definition alongside the supplied tree,
creates permanent Applications and a root Window/Surface, and owns state,
checkpoints, occurrence operations, and unreachable dynamic cleanup.

The outermost React `AppletEngine` constructs and disposes its engine. A nested
binding reuses that engine. A supplied live `scheme` updates that same runtime.
An explicitly injected `engine` receives its root Application/state/composition
contexts, including when it differs from a surrounding runtime. Injecting the
same surrounding engine preserves the current nested Application context.
The injector owns disposal through `engine.destroy()`.
`AppletEngine.useOwnership()` reports whether the current binding constructed
its engine. `onEngine` receives the active instance. Reset replaces an owned
runtime and its occurrences; it does not replace the surrounding host.

The registry path identifies a definition. `applicationId` identifies runtime
Application state. `surfaceId` identifies presentation, and `windowId` identifies
its logical parent and lifecycle record. Reparenting preserves all three
runtime identities. Concealment alone does not remove an occurrence or end its
state. Closing the last Surface of an Application ends its named state;
unreachable dynamic branches are removed. A later occurrence begins from its
owners' current defaults.

## Composition material

The constructor, React `AppletEngine`, and definition binder accept the same
optional composition object:

```js
const composition = {
  ReferenceSurface,
  Provider,
  Boundary,
  ThemeProvider,
  defaultTheme,
  DeckSurface,
  rootDefaults: { Record, Tab },
}
```

`ReferenceSurface` renders registered reference placements.
`Provider` wraps the runtime's React content and receives the optional `dnd`
props. `Boundary` establishes a definition binder's recursive presentation
boundary. Raw `AppletEngine` composition does not insert that definition
boundary: an injected root can render its references through the root composer.
`ThemeProvider` may compose additional consumer context around the exported
generic theme provider; it receives the exact resolved occurrence material and
recorded `themeRoot`, and must retain that canonical theme context.
`defaultTheme` supplies a complete consumer fallback declaration, resolved by
the same scheme path for null and unavailable roots.
`rootDefaults` supplies absent product material on a nonmutating adaptation of
the requested RootApplet. Existing RootApplet material is retained. The package
does not import domain definitions, data clients, visual assets, drag systems,
or host authentication.

Omitted material has a neutral behavior: reference placements render children
under their occurrence theme, Provider and Boundary pass children through, and
the Deck supplies no additional visual content. Compositor traversal still
enters the complete tree. A visual consumer supplies its own presentation and
selection/disclosure treatment.

The shared compositor `SurfaceComposer` owns recursive runtime traversal. It
receives `applicationContext={AppletApplicationContext}` and enters the linked
Application with `application`, `surface`, `window`, and `controls`. Presentation
owners consume these structural records instead of spreading them into DOM.
They combine immediate-child selection, exposure, and allocation while retaining
runtime composition. Product presentation-only material may unmount without
removing the occurrence; ongoing operations and working state remain with
their declared retained owners.

`useChildSurfaceComposition({ engine, ownerSurfaceId,
onSelectedSurfaceChange })` subscribes to the owner and its ordered immediate
children. It supplies `childSurfaces`, `childSurfaceIds`, `selectedSurfaceId`,
and `selectSurface`, retaining an occupied resident slot during a peel and
supplying the first available immediate child when selection is unavailable.
Attention or other visual relations are composed by the consumer.

## Selection and residency

Each Surface selects at most one immediate child. Selection composes
recursively. Residence and member admission are independent. A resident recipe
can declare `addable: true` while its recipe-owned members continue to be
replenished. Omission defaults recipe admission to false. Ordinary Deck props
default `addable` and `unmountable` to true; recipe-supplied Decks set
`unmountable: false`. Placement material uses these choices for its controls.

A frozen recipe belongs in its publishing Applet's `recipes` array. It has a
stable `name`, optional relative `workspace`, and either ordered
`residents: [{ applet, state? }]` or `settingsOf` container paths. Paths resolve
under the publishing owner. Names are unique in the receiving Workspace; own
recipes precede ancestor recipes. Each resident definition appears once.

The engine supplies one fullscreen Deck for every missing recipe. Its props
contain the resolved recipe, admission and unmounting choices, order, and
`resident: { containerSurfaceId, key: recipeName }`. A saved Deck retains its
saved recipe; a missing Deck receives the current default recipe. Its resident
members receive fresh Application/Surface/Window identities and record
`resident: { containerSurfaceId, key: applicationName }` plus order. Starting
state is supplied only when that occurrence is created.

Supply runs after restoration and compositor changes. A resident record keeps
its slot occupied during a held peel. Cancellation retains the record;
completion removes its resident relation and supplies a fresh occurrence.
Ordinary members have no supply requirement. An ordinary member added to an
admitting resident Deck leaves its recipe-owned members intact.

The generic `Deck` invokes `composition.DeckSurface` with the live model:
`application`, `engine`, `surface`, `composition`, `residents`, `addable`,
`unmountable`, `menuOpen`, `onMenuOpenChange`, and `departChild`.
`useDeckComposition` provides that same model for direct material composition.
The controller owns ordered resident slots, placeholder definition lookup,
nonpersistent menu state, and successor selection when an ordinary active child
departs. The consumer provides movement declarations and visual rendering.
`Deck.Bar`, `Presentation`, `Placeholder`, `Spine`, and `Switch` resolve the
corresponding supplied DeckSurface parts through the same runtime.

## Named Application state

```jsx
const [value, setValue] = AppletEngine.useState(initialValue, 'semantic-name', {
  persistent: true,
  adopt: (saved) => typeof saved === 'string' ? saved : undefined,
})
```

Names are nonempty strings scoped to the exact Application. A declaration
supplies a missing value once. The owner adopts recognized saved JSON or uses
its current default; unknown saved names disappear from the next checkpoint.
Persistent values must be immutable JSON. `persistent: false` retains temporary
occurrence values across presentation reparenting but omits them from capture.
Live callbacks, promises, requests, loading state, and resources remain with
their React or host owners. Serializable retry identity and fixed operation
input may be durable when the owning operation requires them.

`AppletEngine.Application` provides an explicit Application boundary.
`useApplication()`, `use()`, `useOptional()`, and `useRootApplet()` read the same
canonical contexts across every binding. The state store API is available for
runtime owners and tests; ordinary Applets declare named state through the hook.

Hook declarations adopt live values and the clean baseline synchronously. Their
subscriber notifications run after the current render stack, including when
React abandons that render. Checkpoint cache invalidation remains synchronous,
so capture and dirty-state reads immediately see the adopted state. Ordinary
state writes still notify synchronously.

## Surface state and root checkpoints

The complete checkpoint is one `surfaceState[]` array. Each entry carries its
Surface identity/state, linked Window record, Application identity, and
`appletState` named JSON. There are no parallel saved maps or checkpoint wrapper.
Live Application props are not checkpointed. Restoration adopts recognized
definitions, relationships, geometry, selection, and named values while current
owners supply missing defaults. Existing recognized identities are retained.
Unavailable definitions and obsolete values disappear from subsequent capture.

`options.initialState` supplies that direct array. `null` and an empty array
mean no saved state. `options.cleanState` independently supplies a global clean
baseline when the chosen initial state came from local recovery. An explicit
missing clean state leaves recovered local state unsaved.

The checkpoint exposes `getSnapshot()`, `subscribe(listener)`, `capture()`,
`release(capture)`, `markClean(capture)`, and `isDirty()`. A capture freezes its
exact submitted array and must be released. Successful explicit saving marks
that exact capture clean; later writes are excluded. A fresh runtime begins
with its constructed clean state. A restored baseline is independently adopted
by current owners, preserving recognized differences from local recovery.

Every durable write is default supply or an ordinary change. Named defaults,
missing anchors/residents, unavailable selection, and missing full Presentation
geometry are declared supply. Supply changes only its exact target in live
state and an existing baseline. An ordinary replacement ends that target's
supply eligibility. Supply never creates a baseline for local-only recovery.
The runtime is dirty when its live array differs from its clean array; reverting
ordinary edits reads clean. This rule applies throughout runtime lifetime,
including later occurrences and resident replacement.

Full Presentation restoration constrains recorded size using the presented
Applet's live `meta.minimumSize`, defaulting to 240 by 180. Deck selection
resolves the actual presented definition. Consumer sizing/peeling material
uses that same definition contract; container allocations remain separate.

## Themes

The public theme API exports `createAppletTheme`, `resolveAppletTheme`,
`AppletThemeProvider`, `useAppletTheme`, `useAppletThemeRoot`,
`AppletThemeContext`, `AppletThemeRootContext`, and `DEFAULT_APPLET_THEME`.
A declaration supplies complete colour identity: `backgroundColor`, `fontColor`,
nullable `borderColor`, `highlightColor`, and `shadowColor`. Consumer-owned
material fields are retained as immutable plain objects, arrays, strings,
booleans, finite numbers, or null. An optional `reconcile(identity, scheme)`
resolves that declaration into complete material; `identity` excludes the
reconciler and is immutable. The result carries the same five base colour fields
and any consumer-defined roles. Reconciliation is pure and cannot return a
second reconciler. The runtime validates declarations and resolved material.

A definition declaring `meta.theme` establishes a theme root. Other occurrences
inherit the root of the occurrence that instantiated them. Surface props record
that root's full registry name; movement retains it. `runtime.themeFor(surface)`
selects this recorded origin and resolves its registered declaration with the
live scheme. An unavailable root or explicit null resolves `composition.defaultTheme`,
or the product-independent neutral fallback when none is supplied. An older
entry without the field uses its definition's nearest static root.

The constructor, React `AppletEngine`, and definition binder accept `scheme`.
The key is a nonempty consumer-owned string; omission supplies `undefined` to
the reconciler, which may define its default. `runtime.getScheme()` reads the
selection, `runtime.setScheme(scheme)` changes it, and
`runtime.subscribeTheme(listener)` observes changes independently of durable
state. An outer React binding applies a supplied live scheme; nested bindings
reuse its runtime and do not select a different scheme. An omitted React scheme
leaves an injected runtime's existing selection intact. Repeating the selected
key neither publishes nor recomputes material.

Resolved material is cached per runtime, registered root, and scheme. Occurrences
of one root share its exact object, while equal-valued roots and separate
runtimes retain their own material identities. Returning to a previous scheme
reuses its cached object. The public lookup and canonical context publish that
same immutable result. Engine context observers re-render for live scheme changes
while `AppletEngine.use()` and `useOptional()` retain the exact engine identity,
including nested owners that resolve and publish their own occurrence material.
`AppletThemeProvider` also resolves standalone declarations
with its optional `scheme` and passes already resolved material unchanged.

Scheme changes retain the engine, Applications, Surfaces, recorded roots, named
state, complete checkpoints, and dirty status. `engine.destroy()` releases the
runtime's theme subscriptions, cached material, and owned runtime subscriptions,
then destroys its compositor. Owned React bindings perform this disposal on
unmount; injected engines remain the injector's responsibility. Product scheme
catalogues, palette meanings, font assets, CSS, and control-colour composition
remain consumer-owned.

## Verification

Run `npm test --workspace react-desktop-environment`, then build and run
`npm run test:package --workspace react-desktop-environment`. The package check
installs its actual tarball into an independent temporary consumer and exercises
public ESM entries, one React/context identity, occurrence state, checkpoints,
and recovery without source aliases.
