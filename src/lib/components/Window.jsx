import WindowFrame from "./frames/WindowFrame";
import { useContext } from "react";
import { WindowManagerContext } from 'react-window-manager';

export default function Window({
        liftWindowToTop, hideWindow, closeWindow, //currentWindowId, useWmState,
        initialPosition, initialSize, initialTitle, 
        ...props
    }){

    const { currentWindowId, useWmState }= useContext(WindowManagerContext);

    const [ gridPosition, setGridPosition ] = useWmState('gridPosition', initialPosition );
    const [ gridSize, setGridSize ] = useWmState('gridSize', initialSize );

    const [ title, setTitle ] = useWmState('title', initialTitle );

    return <WindowFrame
        //
        liftWindowToTop = { ()=>{ liftWindowToTop(currentWindowId) } }
        hideWindow = { ()=>{ hideWindow(currentWindowId) } }
        closeWindow = { ()=>{ closeWindow(currentWindowId, 'active') } }
        //
        initialTitle = {[ title, setTitle ]}
        initialPosition={[ gridPosition, setGridPosition ]}
        initialSize={[ gridSize, setGridSize ]}
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