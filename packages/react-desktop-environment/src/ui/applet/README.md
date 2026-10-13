# Stock Applet UI

The stock UI is an interactive wireframe for the
[AppletEngine](../../applet-engine/README.md). It connects the engine's Applet
behavior to neutral frames and controls. Replace its material progressively
for a custom appearance; use the compositor directly when composing different
behavior.

```jsx
import { createAppletEngine } from 'react-desktop-environment/applet-engine'
import { appletComposition } from 'react-desktop-environment/ui/applet'

const Engine = createAppletEngine(RootApplet, { composition: appletComposition })

<Engine desktopEnvironment={desktopEnvironment}>
  <RootApplet />
</Engine>
```

The definition, desktop environment and opening operations use the engine's
existing contract. Recipe-supplied Decks appear immediately. No product Applets,
assets, data providers or authentication are required by the stock material.

`appletComposition` supplies `ReferenceSurface`, `DeckSurface` and `Provider`.
The provider presents the root's available allocation. Each reference consumes
its immediate host's allocation and [engine selection](../../applet-engine/README.md#selection-and-residency):
mounted selection outside Decks and member selection inside Decks. It then becomes
a host for its own children. Decks, Workspaces and floating Surfaces can nest in either
direction. Concealed Applets remain composed with their occurrence state.
Selection and parent identity come from engine records even when an intervening
frame is custom. DOM allocation context is scoped to the exact engine and host.

The stock controls select Applets, open a Deck menu, close an Applet or Deck,
drag and resize floating frames, and switch between fullscreen and restored
geometry. Their operations belong to AppletEngine. The UI owns DOM measurement,
pointer previews and rendering; it does not maintain another runtime tree or
decide which occurrence succeeds a closed Applet. Resizing a full presentation
uses the engine's presented-Applet minimum size. Floating drag uses the same
`Window` material exported by the independent basic UI entry.

`AppletSurface` is the stock reference frame. It receives the structural
`surface` and composed `children` supplied by `SurfaceComposer`. Consumers can
replace any material in `appletComposition` while retaining the engine's
records and operations. A replacement provider or frame supplies its own
allocation and exposure; the stock presentation context is private to this UI.

The separate `ui/applet` entry keeps the basic `ui` entry usable without loading
AppletEngine. Stock controls intentionally use ordinary HTML elements and
neutral inline presentation; Workbench themes, Forms, attention treatment and
product-specific drag destinations remain with their consumers.
