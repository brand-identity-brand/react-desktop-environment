# Stock Applet UI

The stock UI is an interactive wireframe for the
[AppletEngine](../../applet-engine/README.md). It reads runtime records and calls
public operations; its material and providers belong to this UI.

```jsx
import { AppletEngine } from 'react-desktop-environment/applet-engine'
import { AppletPresentation } from 'react-desktop-environment/ui/applet'

function RootApplet({ application, surface }) {
  return <AppletPresentation surface={surface} scheme="classic">
    <RootControls application={application} surface={surface} />
  </AppletPresentation>
}

<AppletEngine engine={engine}>
  <RootApplet application={application} surface={surface} />
</AppletEngine>
```

`AppletPresentation` owns the allocation context, GUI theme lookup, and rendering
of its Surface's immediate children. Each child Applet owns its descendants.
The stock Deck GUI renders its own members through the same compositor. It uses `AppletSurface` for reference frames
and `DeckSurface` for the engine's generic Deck model. Its optional
`renderSurface(props)` draws a custom frame in this presentation. Nothing is
installed on the engine. Applets using another GUI compose that GUI themselves.
A nested stock Applet keeps its own theme and child frame choices. An existing
frame for that exact occurrence supplies allocation without taking over its
child rendering.

Each reference consumes its immediate host's allocation and
[engine selection](../../applet-engine/README.md#selection-and-residency): mounted
selection outside Decks and member selection inside Decks. It becomes a host for
its children. Decks, Workspaces, and floating Surfaces can nest in either
direction. Concealed Applets retain their occurrence state. Selection and parent
identity come from engine records even when an intervening frame is custom.
DOM allocation context is scoped to the exact engine and host.

Stock controls select Applets, open a Deck menu, close an Applet or Deck, drag
and resize floating frames, and switch fullscreen geometry. The UI owns DOM
measurement, pointer previews, and rendering. It calls the engine's operations
without maintaining another runtime tree. Resizing uses the engine's
presented-Applet minimum size. Floating drag uses the same `Window` material
exported by the independent basic UI entry.

## Themes

This entry exports `createAppletTheme`, `resolveAppletTheme`,
`AppletThemeProvider`, `useAppletTheme`, `useAppletThemeRoot`,
`AppletThemeContext`, `AppletThemeRootContext`, and `DEFAULT_APPLET_THEME`.
Declarations contain `backgroundColor`, `fontColor`, nullable `borderColor`,
`highlightColor`, and `shadowColor`. Additional immutable JSON material is
retained. An optional pure `reconcile(identity, scheme)` receives the immutable
identity without the reconciler and returns complete material with the same
five colour fields and optional consumer roles. A result cannot contain another
reconciler. The UI validates declarations and resolved material.

`createAppletThemes(engine, defaultTheme)` creates a GUI-owned lookup
`themeFor(surface, scheme)`. It reads a recorded `surface.props.themeRoot`, or
resolves the nearest declaring definition through the public registry when that
field is absent. Unavailable and explicit null roots use the supplied fallback,
or `DEFAULT_APPLET_THEME`. `resolveAppletThemeRoot(registry, applicationName)`
exposes that definition lookup. The engine never interprets theme declarations.

The lookup caches material by root and scheme for its GUI lifetime. Equal-valued
roots remain independent; a scheme revisit reuses its exact material. Consumers
share this lookup through their own GUI composition. `AppletThemeProvider` passes
resolved material unchanged and can also resolve a declaration using its
optional `scheme`. Scheme selection belongs to the GUI and changes no runtime
records, occurrence identities, or checkpoints.

The separate `ui/applet` entry leaves the basic `ui` entry independent of
AppletEngine. Stock controls use ordinary HTML elements and neutral material;
product Forms, attention, data providers, and drag destinations belong to their
own GUIs.
