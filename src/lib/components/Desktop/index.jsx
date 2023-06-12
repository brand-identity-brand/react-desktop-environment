import css from './index.module.css';
import { useContext, useState, useEffect, useRef, cloneElement, forwardRef } from 'react';
import { WindowManagerContext } from '../../contexts/DesktopEnvironmentContextProvider';
import { styles } from '../../utils';
// import { Window } from './lib';
// TODO: maybe remove forwardRef Wapper.
export const Desktop = forwardRef( function Desktop({children, className, style, ...props}, ref){
    const { 
        id = 0,
        minimisedWindowIds = []
    } = props;

    const  {
        helpers,
        windowsRef,
        windowsTree,
        renderWindow,
        getWindowsByParentId
    } = useContext(WindowManagerContext);
   

    const windowIds = Object.keys( getWindowsByParentId(id) );
    // console.log('Desktop.prop.id', windowIds)
    const filteredWindowIds = windowIds.filter( windowId => !minimisedWindowIds.includes(windowId) );

    // const masterRef = useRef();

    // const maxZIndex = 2147483647;

    return (
        <div
            ref={ref}
            className={styles(css.master, className)}
            style={style}
        >

            { filteredWindowIds.map( renderWindow ) }
            {
                // ! children is either reactElement or reactElement
            }
            {children}

        </div>
    )
});

export default Desktop;


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