import AppletEngine from './AppletEngine.jsx'
import useChildSurfaceComposition from './useChildSurfaceComposition.js'
import { resolveDeckProps } from './deckProps.js'

/** Runtime identity for a Deck. Its GUI is composed by the presenting owner. */
export default function Deck() {
  return null
}

export function useDeckComposition({ engine, surface }) {
  const [menuOpen, setMenuOpen] = AppletEngine.useState(false, 'menuOpen', {
    persistent: false,
  })
  const composition = useChildSurfaceComposition({
    engine,
    ownerSurfaceId: surface?.surfaceId,
  })
  const allSurfaces = Object.values(engine.compositor.getSnapshot().surfaces)
  const residents = (surface?.props?.recipe?.residents ?? []).flatMap(({ applet }) => {
    const node = engine.runtime.resolveApplicationNode(applet)
    if (!node) return []
    const resident = allSurfaces.find(({ props }) => (
      props?.resident?.containerSurfaceId === surface.surfaceId
      && props.resident.key === applet
    ))
    return [{
      applicationName: applet,
      Placeholder: node.Applet.Placeholder,
      residentSurfaceId: resident?.surfaceId ?? null,
    }]
  })
  const { addable, unmountable } = resolveDeckProps(surface?.props)

  return {
    addable,
    composition,
    menuOpen,
    onMenuOpenChange: setMenuOpen,
    residents,
    unmountable,
  }
}

Deck.meta = Object.freeze({
  applicationName: 'deck',
  displayName: 'Surface Deck',
  version: 1,
})
Deck.applets = Object.freeze({})
