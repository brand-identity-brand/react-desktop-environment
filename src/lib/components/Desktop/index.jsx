import css from './index.module.css';
import { useContext } from 'react';
import { WindowManagerRegistryContext, WindowManagerContext, WindowManagerProvider } from 'react-window-manager';
import { DesktopEnvironmentContext } from '../../contexts/DesktopEnvironment';
import Window from '../Window';

// import { Provider as JotaiProvider, getDefaultStore } from "jotai";

// TODO: maybe remove forwardRef Wapper.
// ! children has to be reactElement
export default function Desktop({children, className, style}){
    const  { getAllWindowSpecs } = useContext(WindowManagerRegistryContext);
    const  { components } = useContext(DesktopEnvironmentContext);

    const { windows, liftWindowToTop, hideWindow, closeWindow }= useContext(WindowManagerContext);

    const windowSpecs = getAllWindowSpecs();
    // const masterRef = useRef();

    // const maxZIndex = 2147483647;
console.log(windowSpecs)
    return (
        <div className={`${css.master} ${className}`} style={style}>
            {children}
            { windows.active.map( (childWindowId)=>{ 

                const { Component: componentTag, props } = windowSpecs[childWindowId];
                const Component = components[componentTag];
                // compare props and states, if there are same keys prioritise state
                const windowControllerProps = {
                    liftWindowToTop: ()=>{liftWindowToTop(childWindowId)}, 
                    hideWindow: ()=>{hideWindow(childWindowId)}, 
                    closeWindow: ()=>{closeWindow(childWindowId, 'active')},
                }
                const completeProps = { ...props, ...windowControllerProps}
                return ( 
                    <WindowManagerProvider id={childWindowId} key={childWindowId}>
                        <Window {...completeProps}>
                            <Component {...completeProps}/>
                        </Window>
                    </WindowManagerProvider>
                )
            })}
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