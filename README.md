# React Window Manager

React Window Manager is a react context that manages element rendering with:
 - windowsTree:
```javascript
{
    id:{ 
        id:{}, 
        id:{
            id:{}
        }, 
        id:{} 
    }, 
    id:{
        id:{}
        id:{}
    }
}
```
 - windowsRef:
```javascript
{
    id:{ 
        address: [ 12, 26, 70, 80, id ],
        zIndex: 9,
        props: { ...props },
        Component: Component
    }, 
    id:{
        address: [ 12, 26, 70, 80, parentId, id ],
        zIndex: 15,
        props: { ...props },
        Component: Component
    }
}
```

## Installation

```zsh
npm i react-window-manager
```

## Usage
```javascript
// main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import WindowManagerContextProvider from 'react-window-manager';

ReactDOM.createRoot(document.getElementById('root')).render(
  <WindowManagerContextProvider>
    <React.StrictMode>
        <App />
    </React.StrictMode>
  </WindowManagerContextProvider>,
)
```
```javascript
// App.jsx
import { useContext } from 'react';
import { WindowManagerContext } from 'react-window-manager';

function App() {
    const  {
        windowsTree,
        createWindow, // this function accepts ( Component, {...props}, parentWindowId ) then inserts a new window into windowsRef
        renderWindow, // this function accepts ( id ) then renders react element accoding to windowsRef
    } = useContext(WindowManagerContext);

    
    const windowIds = Object.keys( windowsTree ); // [id] to be rendered.

    return (
        <>
            { windowIds.map( renderWindow ) } {/* renders windows according to [id]*/}
            <button 
                onClick={() => {
                    createWindow(
                        Window, // Component
                        {}, // props object
                        0 // parent window id
                    );
                }}
            >
                this button adds a new window
            </button>
        </>
    )
    // createWindow automatically passes {id, zIndex} via props.
    // zIndex: to maintain appwide layering you need zIndex in your props 
    // id: createWindow, closeWindow requires id
    const Window = ({id, zIndex, ...props}) => {
        const { children } = props;
        const  { windowToTop } = useContext(WindowManagerContext);
        const [ localZIndex, setLocalZIndex ] = useState(zIndex);
        return (
            <div
                style={{
                    zIndex: localZIndex
                }}
                onMouseDown={()=>{  setLocalZIndex( windowToTop() ) }}
            >
                {children}
            </div>
        )
    };
```

```javascript
// App.jsx
import { useContext } from 'react';
import { WindowManagerContext } from 'react-window-manager';

function App() {
    const  {
        windowsTree,
        createWindow,
        renderWindow, 
        useMinimise, // this hook keeps track of hidden/minimised windows by their id using [Int].
    } = useContext(WindowManagerContext);

    // the hook accepts initial value, this is for restoring states.
    // minimisedWindowIds: e.g. [ 1, 4, 23, 14, 89, 420, 69 ]
    // minimiseWindow: this function accepts id, then append that id into minimisedWindowIds
    // restoreMinimisedWindow: this function removes accepted id, then removes it from minimisedWindowIds
    // refresh localhost:port each time after code saves durign development for this to work properly.
    const { minimisedWindowIds, minimiseWindow, restoreMinimisedWindow } = useMinimise([]);

    const windowIds = Object.keys( windowsTree );
    // filter the hidden/minimised windows to avoid rendering them
    const filteredWindowIds = windowIds.filter( windowId => !minimisedWindowIds.includes(windowId) );

    return (
        <>
            { windowIds.map( renderWindow ) }
            <button 
                onClick={() => {
                    createWindow(
                        Window,
                        {
                            minimise: (id) => {  minimiseWindow(id); },
                            restore: (id) => {  restoreMinimisedWindow(id); },
                        },
                        0
                    );
                }}
            >
                this button adds a new window
            </button>
        </>
    )

    const Window = ({id, zIndex, minimise, restore}) => <div>
        <button
            onClick= {() => {  minimise(id) }}
        > minimise </div>
        <button
            onClick= {() => {  restore(id) }}
        > restore </div>
    </div>
}
```
```javascript
// Window.jsx
import { useContext } from 'react';
import { WindowManagerContext } from 'react-window-manager';

function Window({id, zIndex}) {
    const  {
        closeWindow,
        windowToTop,
    } = useContext(WindowManagerContext);

    // these two functions can be imported anywhere becuase they do not rely on parent window id. 
    // you can pass them down from createWindow or import them inside your window element
    // closeWindow(id): accepts the id of the window to be closed, then it removes the id from windowsTree
    // windowToTop(): returns the top level z-index, usually called in onMouseDown of the window element 
}
```