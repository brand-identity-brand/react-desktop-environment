import React from 'react'
import AppletEngine from './AppletEngine.jsx'
import useChildSurfaceComposition from './useChildSurfaceComposition.js'
import { resolveDeckProps } from './deckProps.js'

/** The engine's Deck definition; replaceable material receives its live model. */
export default function Deck({ application, surface, ...props }) {
  const engine = AppletEngine.use()
  const model = useDeckComposition({ engine, surface })
  const Surface = engine.composition.DeckSurface
  return Surface ? (
    <Surface {...props} {...model} application={application} engine={engine} surface={surface} />
  ) : null
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

function part(name) {
  return function DeckPart(props) {
    const engine = AppletEngine.use()
    const Part = engine.composition.DeckSurface?.[name]
    return Part ? <Part {...props} /> : null
  }
}

Deck.Surface = Deck
Deck.Bar = part('Bar')
Deck.Presentation = part('Presentation')
Deck.Placeholder = part('Placeholder')
Deck.Spine = part('Spine')
Deck.Switch = part('Switch')
Deck.Switch.Bar = Deck.Switch
Deck.Switch.Inline = Deck.Switch
Deck.meta = Object.freeze({
  applicationName: 'deck',
  displayName: 'Surface Deck',
  version: 1,
})
Deck.applets = Object.freeze({})
