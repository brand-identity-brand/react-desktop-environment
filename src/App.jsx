import { useContext, useState, useEffect, useRef } from 'react';
import { WindowManagerRegistryContext, WindowManagerContext, WindowManagerProvider } from 'react-window-manager';
import { Desktop, Start, Window } from './lib';
import Inception from './exampleComponents/Inception';

function AppFragment() {
    const  { initWindow, getAllWindowSpecs } = useContext(WindowManagerRegistryContext);

    const { currentWindowId, registerWindow, hideWindow, unhideWindow, closeWindow, windows} = useContext(WindowManagerContext);

    const idRef = useRef()
    return (<>
        <Desktop style={{ width: '100vw', height: 'calc( 100vh - 30px - 2px )', backgroundColor: 'white'}}>
            {/* <WindowWithContext />
            <Window /> */}
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
                // console.log(getAllWindowSpecs())
            }}> initWindow </button> <br/>


            <button onClick={()=>{ hideWindow(idRef.current) }}> hideWindow </button><br/>
            <button onClick={()=>{ unhideWindow(idRef.current) }}> unhideWindow </button><br/>
            <button onClick={()=>{ closeWindow(idRef.current) }}> closeWindow </button><br/>
            
            { `active: ${ JSON.stringify(windows.active) }`}<br/>
            { `hidden: ${ JSON.stringify(windows.hidden) }`}<br/>
            { `closed: ${ JSON.stringify(windows.closed) }`}<br/>

        </Desktop>
        <Start/>
        {/* < Start.Bar>
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
                        <Start.Windows.Minimised key={id}
                            onClick={()=>{unhideWindow(id)}}
                        >
                            {id}
                        </Start.Windows.Minimised>
                    )
                })}
            </Start.Windows>
            <Start.Footer>

            </Start.Footer>
        </Start.Bar> */}
    </>)
}

export default function App({props}){
    return (
        <WindowManagerProvider id={'/index'} key={'/index'}>
            
            <AppFragment {...props} />
        </WindowManagerProvider>
    )
}