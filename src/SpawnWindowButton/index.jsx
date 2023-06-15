import { useContext, useRef } from 'react';
import { WindowManagerContext } from '../lib/contexts/DesktopEnvironmentContextProvider';

export default function SpawnWindowButton({className, style, children, ...props}){
    // createWindow
    const {
        Component, //WindowComponent but react only allows "Component" for react functional component
        // minSize,
        initialPosition,
        initialSize,
        parentWindowId,
        minimiseWindow, // function called on minimise, could be undefined  // minimiseFuncion, undefined, false || 'disable'
        closeWindow, // 'disable'
        moveWindow, // 'disable'
        resizeWindow, // 'disable'
        //
        useMinimise
    } = props;
    // this component
    const { 
        spawnOneOnly = false// bool
    } = props;

    const spawnedWindowId = useRef(undefined);

    const { createWindow, windowIdRef, windowsTree, windowsRef } = useContext(WindowManagerContext); 

    return (
        <button 
            className={className}
            style={style}
            onClick={() => {
                if ( spawnOneOnly ) {

                } else {
                    createWindow(Component, {
                        // minSize: minSize,
                        initialPosition: initialPosition,
                        initialSize: initialSize,
                        minimiseWindow: minimiseWindow, // 'disable', undefined, function() => disabling this wil disable maximise too
                        closeWindow, // 'disable', undefined ,()=>{}
                        moveWindow, // 'disable', undefined
                        resizeWindow, // 'disable', undefined
                    }, parentWindowId);//, useMinimise);
                }
            }}
        >
            {children}
        </button> 
    )
}