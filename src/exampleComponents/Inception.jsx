import { WindowManagerContext } from 'react-window-manager';
import PresetWindow from "./PresetWindow";
import { useContext, useState } from "react";

export default function Inception({...props}){

    const { id: parentId, getNextIdCounter, initWindow, registerWindow, hideWindow, unhideWindow, closeWindow, getWindowState, setWindowState, states, ...windows} = useContext(WindowManagerContext);
    
    const [ idToAction, setIdToAction] = useState(0);

    return (
        <PresetWindow {...props}>
            <input onChange={(e)=>{ setIdToAction(e.target.value) }} placeholder={idToAction}></input><br/>
            <button onClick={()=>{
                const id = idToAction? idToAction : getNextIdCounter();
                initWindow(id,{
                    Component: Inception.name,
                    props: {
                        initialTitle : 'incep'+' '+id,
                        initialPosition: {
                            left: 10,
                            top: 10
                        },
                        initialSize: {
                            width: 100,
                            height: 100
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
        </PresetWindow>
    )
}