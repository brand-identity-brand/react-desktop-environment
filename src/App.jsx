import { useContext, useState, useEffect, useRef } from 'react';
import { WindowManagerRegistryContext, WindowManagerContext, WindowManagerProvider } from 'react-window-manager';
import { Desktop, Start } from './lib';
import Inception from './exampleComponents/Inception';

function AppFragment() {
    
    const { getNextIdCounter, initWindow, registerWindow, hideWindow, unhideWindow, closeWindow, setData,...windows} = useContext(WindowManagerContext);

    const [ idToAction, setIdToAction] = useState(0);

    return (<>
        <Desktop style={{ width: '100vw', height: 'calc( 100vh - 30px - 2px )', backgroundColor: 'white'}}>
            <input onChange={(e)=>{ setIdToAction(e.target.value) }}></input><br/>
            <button onClick={()=>{
                const id = idToAction? idToAction : getNextIdCounter();
                initWindow(id,{
                    Component: Inception.name,
                    props: {
                        initialTitle : `title: ${id}`,
                        initialPosition: {
                            left: 10,
                            top: 10
                        },
                        initialSize: {
                            width: 300,
                            height: 200
                        }
                    }
                });
                registerWindow(id); 
            }}> initWindow </button> <br/>


            <button onClick={()=>{ hideWindow(idToAction) }}> hideWindow </button><br/>
            <button onClick={()=>{ unhideWindow(idToAction) }}> unhideWindow </button><br/>
            <button onClick={()=>{ closeWindow(idToAction) }}> closeWindow </button><br/>
            
            { `active: ${ JSON.stringify(windows.activeWindows) }`}<br/>
            { `hidden: ${ JSON.stringify(windows.hiddenWindows) }`}<br/>
            { `closed: ${ JSON.stringify(windows.closedWindows) }`}<br/>

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
                {windows.hiddenWindows.map( id => {
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

export default function App({props}){
    return (
        <WindowManagerProvider id={'/index'}>
            <AppFragment {...props} />
        </WindowManagerProvider>
    )
}