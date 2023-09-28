import WindowFrame from "./frames/WindowFrame";
import { useContext } from "react";
import { WindowManagerContext, WindowManagerRegistryContext } from 'react-window-manager';

export default function Window({
        liftWindowToTop, hideWindow, closeWindow, //currentWindowId, useWmState,
        initialPosition, initialSize, initialTitle, 
        ...props
    }){

    const {
        currentWindowId,
        setWindowState,
        getWindowState
    }= useContext(WindowManagerContext);

    if ( !getWindowState('gridPosition') ) {
        setWindowState('gridPosition', initialPosition)
    }
    if ( !getWindowState('gridSize')){
        setWindowState('gridSize', initialSize)
    }
    const gridPosition = getWindowState('gridPosition')
    const setGridPosition = (value) => setWindowState('gridPosition', value)
    const gridSize = getWindowState('gridSize') 
    const setGridSize = (value) => setWindowState('gridSize', value)

    return <WindowFrame
        //
        liftWindowToTop = { ()=>{ liftWindowToTop(currentWindowId) } }
        hideWindow = { ()=>{ hideWindow(currentWindowId) } }
        closeWindow = { ()=>{ closeWindow(currentWindowId, 'active') } }
        //
        initialTitle = {initialTitle}
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