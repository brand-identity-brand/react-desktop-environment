import { useContext, useState, useEffect, useRef } from 'react';
import { WindowManagerRegistryContext, WindowManagerContext, WindowManagerProvider } from 'react-window-manager';
import { Desktop, Start } from '../lib';


export default function Inception({...props}){
    const  { initWindow, getAllWindowSpecs } = useContext(WindowManagerRegistryContext);

    const { currentWindowId, setWindowState, getWindowState, registerWindow, hideWindow, unhideWindow, closeWindow, windows } = useContext(WindowManagerContext);

//     setWindowState('test','fuck you')
// console.log(getWindowState('test'))

    return (<>
        {/* <Desktop style={{ width: '100%', height: 'calc( 100% - 30px - 2px )', backgroundColor: 'white'}}>
            <input onChange={(e)=>{ setTitle(e.target.value) }}></input><br/>
             <button onClick={()=>{
                initWindow('90',{
                    Component: Inception.name,
                    props: {
                        initialTitle : `title: ${90}`,
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
                registerWindow('90'); 
                console.log(getAllWindowSpecs())
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
        </Start.Bar> */}
    </>)
}
