import { useContext, useState, useEffect, useRef } from 'react';
import { WindowManagerContext, WindowWithJotaiStorageAtom } from './lib';
import { Window, Desktop, SpawnWindowButton } from './lib';
// import './App.css'
import ExampleWindow from './ExampleWindow';
import ExampleStart from './ExampleStart';

function App({id}) {
  const  { useMinimise, windowsRef }  = useContext(WindowManagerContext); 
  //!

  const { minimisedWindowIds, minimiseWindow, restoreMinimisedWindow } = useMinimise();

  // const masterRef = useRef();
  // const maxZIndex = 2147483647;
// console.log(windowsRef)
  return (<>
    <Desktop
      // ref={masterRef}
      id={id}
      minimisedWindowIds={minimisedWindowIds}
      style={{
        width: '100vw',
        height: '100vh'
      }}
    >
      <SpawnWindowButton
        Component={Window}
        // minimiseWindow= {(id) => {  minimiseWindow(id); }}
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
      <SpawnWindowButton
        Component={WindowWithJotaiStorageAtom}
        minimiseWindow= {(id) => {  minimiseWindow(id); }}
        // minimiseWindow= {'disable'}
        // moveWindow={'disable'}
        // closeWindow={'disable'}
        // resizeWindow={'disable'}
        parentWindowId={id}
      >
        + example window Jotai
      </SpawnWindowButton>
    </Desktop>
    <ExampleStart id={id}/>
    </>
  )
}

export default App;