import AppletSurface, { AppletPresentation, DeckSurface } from './AppletSurface.jsx'

/** An interactive wireframe; AppletEngine remains the owner of Applet behavior. */
const appletComposition = Object.freeze({
  ReferenceSurface: AppletSurface,
  Provider: AppletPresentation,
  DeckSurface,
})

export default appletComposition
