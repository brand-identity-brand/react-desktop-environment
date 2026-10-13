export const ABSTRACTION = 'Recursive Applet definitions become a shared runtime of Applications, Windows, Surfaces, occurrence state, resident Decks, and complete checkpoints.'

export { default as AppletEngine } from './AppletEngine.jsx'
export { default as AppletEnvironment } from './AppletEnvironment.jsx'
export { default as createAppletEngine, appletEngineApi } from './createAppletEngine.jsx'
export { default as Deck, useDeckComposition } from './Deck.jsx'
export { default as useChildSurfaceComposition } from './useChildSurfaceComposition.js'
export {
  AppletApplicationContext,
  AppletStateStoreContext,
  createAppletStateStore,
  immutableJson,
  useAppletState,
  validateSurfaceState,
} from './AppletState.js'

export { useWhichApplet } from './AppletEngine.jsx'
export { resolveDeckProps } from './deckProps.js'
export { constrainPresentationSize, minimumPresentationSize } from './presentationSize.js'
