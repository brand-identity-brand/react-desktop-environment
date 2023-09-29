import WindowFrame from "./frames/WindowFrame";
import { useContext, useEffect, useState } from "react";
import { WindowManagerContext, WindowManagerRegistryContext } from 'react-window-manager';

export default function Window({
        
        liftWindowToTop, hideWindow, closeWindow, //currentWindowId, useWmState,
        initialPosition, initialSize, initialTitle, 
        ...props
    }){

    const {
        currentWindowId,
        useWindowState,
        initWindowState
    }= useContext(WindowManagerContext);

    const [ gridPosition, setGridPosition ] = useWindowState('gridPosition', initialPosition);
    const [ gridSize, setGridSize ] = useWindowState('gridSize', initialSize);
    // const [ title, setTitle ] = useWindowState('title', initialTitle);
    const title = initWindowState('title', initialTitle);
    
    return <WindowFrame
        //
        liftWindowToTop = { ()=>{ liftWindowToTop(currentWindowId) } }
        hideWindow = { ()=>{ hideWindow(currentWindowId) } }
        closeWindow = { ()=>{ closeWindow(currentWindowId, 'active') } }
        //
        initialTitle = {title}
        initialPosition={[gridPosition, setGridPosition]}
        initialSize={[gridSize,setGridSize]}
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