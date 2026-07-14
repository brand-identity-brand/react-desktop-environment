export const ABSTRACTION = `
The interface is the replaceable visual expression of the desktop experience.

It chooses which compositor capabilities people can see and control, and how
those capabilities feel. It may express the complete experience or only the
parts appropriate to its purpose without becoming the owner of applications,
surfaces, or desktop state.
`

export {


} from './stock.jsx'

import { Fragment } from 'react';

function Desktop({children, windows}){
  return (
    <Fragment>
      {children}
      {windows.map( window => Window({window}) )}
    </Fragment>
  )
}

function Window({window}){ //window component here
  const {  } = window;
  return (
    <div
      // ! all naative html props should use props."key"
      style={props.style}
    >
      {children}
    </div>
  )
}

function ApplicationRenderer({application}){ //window component here
  const { state } = application;
  const { } = state;
  return (
    <div
      // ! all naative html props should use props."key"
      style={props.style}
    >
      {children}
    </div>
  )
}