import css from './index.module.css';
import { useContext, useState, useEffect, useRef, cloneElement, forwardRef } from 'react';
import { WindowManagerRegistryContext, WindowManagerContext, WindowManagerProvider } from 'react-window-manager';
import { DesktopEnvironmentContext } from '../../contexts/DesktopEnvironment';

// import { Provider as JotaiProvider, getDefaultStore } from "jotai";

// TODO: maybe remove forwardRef Wapper.
export default function Desktop({children, className, style}){
    const  { getWindowIds } = useContext(WindowManagerRegistryContext);
    const  { components } = useContext(DesktopEnvironmentContext);
    const windowSpecs = getWindowIds();
    const { activeWindows, liftWindowToTop, hideWindow, unhideWindow, closeWindow }= useContext(WindowManagerContext);

    // const masterRef = useRef();

    // const maxZIndex = 2147483647;


    return (
        <div className={`${css.master} ${className}`} style={style}>

            { activeWindows.map( (id)=>{ 
                const { Component: componentTag, props } = windowSpecs[id];
                const Component = components[componentTag];
                // compare props and states, if there are same keys prioritise state
                return ( 
                    <WindowManagerProvider id={id} key={id}>
                        <Component {...{...props, liftWindowToTop, hideWindow, unhideWindow, closeWindow}}/>
                    </WindowManagerProvider>
                )
            })}
            {
                // ! children is either reactElement or reactElement
            }
            {children}
        </div>
    )
};


/**
 * input the Ref of the element being observed, returns its css height and width on resize.
 */

// export function useListenResize( elementRef ){

//     const resizeObserver = useRef();

//     const [ windowSize, setWindowSize ] = useState({width: undefined, height: undefined});

//     useEffect(()=>{
//         resizeObserver.current = new ResizeObserver((elm) => {
//             const windowInfo = elm[0].contentRect;
//             setWindowSize({
//                 width:  windowInfo.width,
//                 height:  windowInfo.height
//             })
//         });
//         resizeObserver.current.observe(elementRef.current);

//     },[]);

//     return windowSize;
// }