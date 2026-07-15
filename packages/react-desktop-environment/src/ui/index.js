export const ABSTRACTION = `
The interface is the replaceable visual expression of the desktop experience.

It chooses which compositor capabilities people can see and control, and how
those capabilities feel. It may express the complete experience or only the
parts appropriate to its purpose without becoming the owner of applications,
surfaces, or desktop state.

It decides which visual elements and human interactions invoke the surface
controls supplied by the compositor. It does not reproduce the orchestration
behind those controls.
`

export { default as Window } from './Window.jsx'
