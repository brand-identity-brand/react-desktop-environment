# React Desktop Environment

React Desktop Environment is a react ui library that mimicks the behaviour of an OS ui.

## Installation

```zsh
npm i react-desktop-environment
```

## Usage
```javascript
// main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { DesktopEnvironmentContextProvider } from './lib';
import '/node_modules/react-desktop-environment/dist/style.css';

ReactDOM.createRoot(document.getElementById('root')).render(
   <DesktopEnvironmentContextProvider>
        <React.StrictMode>
            <App id={0}/>
        </React.StrictMode>
    </DesktopEnvironmentContextProvider>,
)
```
```javascript
// App.jsx
import { useContext } from 'react';
import { WindowManagerContext, Window, Desktop, SpawnWindowButton } from 'react-desktop-environment';

function App({id}) {
    const  { useMinimise }  = useContext(WindowManagerContext); 
    const { minimisedWindowIds, minimiseWindow, restoreMinimisedWindow } = useMinimise([]);

    // const maxZIndex = 2147483647;
    return (
        <Desktop
            id={id}
            minimisedWindowIds={minimisedWindowIds}
            style={{
                width: '100vw',
                height: '100vh'
            }}
        >
            <SpawnWindowButton
                parentWindowId={id}
                Component={Window}
                initialPosition= {{ top: 300, left: 300} }
                initialSize= {{ width: 300, height: 500}}
                // minimiseWindow= {'disable'}
                // moveWindow={'disable'}
                // closeWindow={'disable'}
                // resizeWindow={'disable'}
            >
                this spawns an empty window that self minimises
            </SpawnWindowButton>
            <SpawnWindowButton
                parentWindowId={id}
                Component={Window}
                initialPosition= {{ top: 300, left: 300} }
                initialSize= {{ width: 300, height: 500}}
                minimiseWindow= {(id) => {  minimiseWindow(id); }}
                // moveWindow={'disable'}
                // closeWindow={'disable'}
                // resizeWindow={'disable'}
            >
                this spawns an empty window that minimises to minimisedWindowIds
            </SpawnWindowButton>

        </Desktop>
    )
}
```