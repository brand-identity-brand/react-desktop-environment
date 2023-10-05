import WindowFrame from "../frames/WindowFrame";
import { useContext, useEffect, useState, useMemo, useRef } from "react";
import { WindowManagerContext, WindowManagerRegistryContext } from 'react-window-manager';

export default function Window({
        liftWindowToTop, hideWindow, closeWindow, //currentWindowId, useWmState,
        initialPosition, initialSize, initialTitle, 
        ...props
    }){

    const {
        currentWindowId,
        useWindowState,
        initWindowState,
        // syncWindowState,
        states,
        setWindowState
    }= useContext(WindowManagerContext);

    // const {current: [ gridPosition, setGridPosition ]} = useRef( useWindowState('gridPosition', initialPosition, false) );
    // const {current: [ gridSize, setGridSize ]} = useRef( useWindowState('gridSize', initialSize, false) );
    
    // useRef( initWindowState('gridPosition', initialPosition) );
    // useRef( initWindowState('gridSize', initialSize) );
    // const [ title, setTitle ] = useWindowState('title', initialTitle);
    const title = initWindowState('title', initialTitle);
    
    return <WindowFrame
        //
        // syncWindowState = { syncWindowState }
        //
        liftWindowToTop = { ()=>{ liftWindowToTop(currentWindowId) } }
        hideWindow = { ()=>{ hideWindow(currentWindowId) } }
        closeWindow = { ()=>{ closeWindow(currentWindowId, 'active') } }
        //
        initialTitle = {title}
        // initialPosition={[gridPosition, (val)=>setGridPosition(val, false)]}
        // initialSize={[gridSize, (val)=>setGridSize(val, false)]}
        initialPosition={[
            // states['gridPosition']
            states.hasOwnProperty('gridPosition')? states['gridPosition'] : initialPosition
            ,
            (value)=>setWindowState(value, false, 'gridPosition')
        ]}
        initialSize={[
            // states['gridSize']
            states.hasOwnProperty('gridSize')? states['gridSize'] : initialSize

            ,
            (value)=>setWindowState(value, false, 'gridSize')
        ]}
        {...props} 
    />
}

Window.defaultProps = {
    minSize: {
        width: 300,
        height: 200
    },
    lockResize: false,
    // maxSize: {
    //     width: 'calc( 100% - 4px)',
    //     height: 'calc( 100% - 4px)',
    // }
    initialTitle: 'default title',
    initialPosition: {left: 50, top:50},
    initialSize:{width: 200, height: 200},
}