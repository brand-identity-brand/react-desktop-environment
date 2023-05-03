import { useContext, useState, useEffect, useRef } from 'react';
import { WindowManagerContext } from './lib';
import { Window, Desktop, SpawnWindowButton } from './lib';
// import './App.css'
import ExampleWindow from './ExampleWindow';

function App() {
  const  { useMinimise }  = useContext(WindowManagerContext); 
  //!

  const { minimisedWindowIds, minimiseWindow, restoreMinimisedWindow } = useMinimise([]);

  // const masterRef = useRef();
  // const maxZIndex = 2147483647;
  const id = 0;
  return (
    <Desktop
      // ref={masterRef}
      id={0}
      minimisedWindowIds={minimisedWindowIds}
      style={{
        width: '100vw',
        height: '100vh'
      }}
    >
      <SpawnWindowButton
        Component={Window}
        minimiseWindow= {(id) => {  minimiseWindow(id); }}
        // minimiseWindow= {'disable'}//{(id) => {  minimiseWindow(id); }}
        // moveWindow={'disable'}
        // closeWindow={'disable'}
        // resizeWindow={'disable'}
        initialPosition= {{ top: 300, left: 300} }
        initialSize= {{ width: 300, height: 500}}
        parentWindowId={id}
      >
        + window
      </SpawnWindowButton>
      <SpawnWindowButton
        Component={ExampleWindow}
        minimiseWindow= {(id) => {  minimiseWindow(id); }}
        // minimiseWindow= {'disable'}
        // moveWindow={'disable'}
        // closeWindow={'disable'}
        // resizeWindow={'disable'}
        parentWindowId={id}
      >
        + example window
      </SpawnWindowButton>
    </Desktop>
  )
}

export default App;