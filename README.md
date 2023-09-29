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
import DesktopEnvironmentWithWindowManagerRegistryProvider from 'react-desktop-environment';
import Inception from './components/Inception';

const components = {
    // a list of components to be rendered in <Window />
    Inception
}
ReactDOM.createRoot(document.getElementById('root')).render(
    <DesktopEnvironmentWithWindowManagerRegistryProvider components={components}>
        <Main/>
    </DesktopEnvironmentWithWindowManagerRegistryProvider>
,
)

function Main(){
    const { initWindow } = useWindowManagerRegistryContext();
    initWindow('/index');
    return (
        <App/>
    )
}
```
```javascript
// App.jsx
import { useContext, useState, useEffect, useRef } from 'react';
import { 
    useWindowManagerRegistryContext, useWindowManagerContext, 
    WindowManagerProvider,
    // components
    Desktop, Start, Window 
} from 'react-desktop-environment';
import Inception from './components/Inception';

function AppFragment() {
    const  { initWindow, getAllWindowSpecs } = useWindowManagerRegistryContext();
    const { currentWindowId, registerWindow, hideWindow, unhideWindow, closeWindow, windows} = useWindowManagerContext();

    const idRef = useRef()
    return (<>
        <Desktop style={{ width: '100vw', height: 'calc( 100vh - 30px - 2px )', backgroundColor: 'white'}}>
            <input onChange={(e)=>{ idRef.current = e.target.value }}></input><br/>
            <button onClick={()=>{
                if ( idRef.current === undefined ) {
                    alert( 'input empty')
                } else {
                    initWindow(idRef.current,{
                        Component: Inception.name,
                        props: {
                            initialTitle : `title: ${idRef.current}`,
                            initialPosition: {
                                left: 500,
                                top: 10
                            },
                            initialSize: {
                                width: 300,
                                height: 200
                            }
                        },
                    });
                    registerWindow(idRef.current); 
                }
            }}> initWindow </button> <br/>


            <button onClick={()=>{ hideWindow(idRef.current) }}> hideWindow </button><br/>
            <button onClick={()=>{ unhideWindow(idRef.current) }}> unhideWindow </button><br/>
            <button onClick={()=>{ closeWindow(idRef.current) }}> closeWindow </button><br/>
            
            { `active: ${ JSON.stringify(windows.active) }`}<br/>
            { `hidden: ${ JSON.stringify(windows.hidden) }`}<br/>
            { `closed: ${ JSON.stringify(windows.closed) }`}<br/>

        </Desktop>
        <Start/>
    </>)
}

export default function App({props}){
    return (
        <WindowManagerProvider id={'/index'} key={'/index'}>
            <AppFragment {...props} />
        </WindowManagerProvider>
    )
}
```
```javascript
import { useRef } from 'react';
import { 
    useWindowManagerRegistryContext,
    useWindowManagerContext,
    //ui
    Desktop, StartFrame as Start
} from 'react-desktop-environment';


export default function Inception({...props}){
    const  { initWindow } = useWindowManagerRegistryContext();
    const { states, setWindowState, registerWindow, hideWindow, unhideWindow, closeWindow, windows } = useWindowManagerContext();

    function setTitle(value){
        setWindowState('title', value);
    }
    
    const idRef = useRef();
    return (<>
        <Desktop style={{ width: '100%', height: 'calc( 100% - 30px - 2px )', backgroundColor: 'white'}}>
            { Object.keys(states).map( key => {
                return (
                    <ul key={key}>
                        <li>
                            {key}
                        </li>
                        <ul>
                            <li>
                                {JSON.stringify(states[key])}
                            </li>
                        </ul>
                    </ul>
                )
            })}
            
            <label>set current Window Title</label><br/>
            <input onChange={(e)=>{ setTitle(e.target.value) }}></input><br/>
            <label>set current new Window Title</label><br/>
            <input onChange={(e)=>{ idRef.current = e.target.value }}></input><br/>
             <button onClick={()=>{
                if ( idRef.current === undefined ) {
                    alert( 'input empty')
                } else {
                    initWindow(idRef.current,{
                        Component: Inception.name,
                        props: {
                            initialTitle : `title: ${idRef.current}`,
                            initialPosition: {
                                left: 500,
                                top: 10
                            },
                            initialSize: {
                                width: 300,
                                height: 200
                            }
                        },
                    });
                    registerWindow(idRef.current); 
                }
            }}> initWindow </button> <br/> 


            <button onClick={()=>{ hideWindow(idToAction) }}> hideWindow </button><br/>
            <button onClick={()=>{ unhideWindow(idToAction) }}> unhideWindow </button><br/>
            <button onClick={()=>{ closeWindow(idToAction) }}> closeWindow </button><br/>
            
            { `active: ${ JSON.stringify(windows.active) }`}<br/>
            { `hidden: ${ JSON.stringify(windows.hidden) }`}<br/>
            { `closed: ${ JSON.stringify(windows.closed) }`}<br/>

        </Desktop>
        < Start.Bar>
            < Start.Menu>
                <div>settings</div>
            </ Start.Menu>
            < Start.Icons>
                <div>{'||'}</div>
                <div>{'||'}</div>
            </ Start.Icons>
            <Start.Windows>
                {windows.hidden.map( id => {
                    return (
                        <button key={id}
                            onClick={()=>{unhideWindow(id)}}
                        >
                            {id}
                        </button>
                    )
                })}
            </Start.Windows>
            <Start.Footer>

            </Start.Footer>
        </Start.Bar>
    </>)
}

```