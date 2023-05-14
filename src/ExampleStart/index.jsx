import { Start } from "../lib";
import { useContext, useState, useEffect, useRef } from 'react';
import { WindowManagerContext } from '../lib';

export default function ExampleStart({id}){
    const { windowsRef, windowToTop, getMinimisedWindowsInDesktop, useMinimise } = useContext(WindowManagerContext); 
    const { minimisedWindowIds, minimiseWindow, restoreMinimisedWindow } = useMinimise();

    return (
        <Start.Bar>
            <Start.Menu>
                <div>settings</div>
                <div>logout</div>
            </Start.Menu>
            <Start.Icons>
                <div>{'||'}</div>
                <button> A </button>
                <button> B </button>
                <div>{'||'}</div>
            </Start.Icons>
            <Start.Windows>
                { getMinimisedWindowsInDesktop(id, minimisedWindowIds).map(minimisedWindowId=>{
                    const { props } = windowsRef.current[minimisedWindowId];
                    return (
                        <Start.Windows.Minimised
                        key={minimisedWindowId}
                        onClick={()=>{
                            windowToTop(minimisedWindowId);
                            restoreMinimisedWindow(minimisedWindowId);
                        }}
                        >
                            {`${props.title}`}
                        </Start.Windows.Minimised>
                    )
                })}
            </Start.Windows>
            <Start.Footer>
                
            </Start.Footer>
        </Start.Bar>
    )
}