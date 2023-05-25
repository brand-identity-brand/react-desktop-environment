import css from './index.module.css';
import { useState, useEffect, useRef, useContext, useMemo } from 'react';
import { WindowManagerContext } from 'react-window-manager';
import WindowFrame from '../WindowFrame';

export default function Window({children, className, style, onClick, ...props}){
    const {
        title,
        id,
        initialZIndex,
        initialPosition,
        initialSize,
        //
        minSize, 
        classNames,
        /* 'local', 'disable', minimiseFunction */
        minimiseWindow, // function called on minimise, could be undefined  // minimiseFuncion, undefined, false || 'disable'
        closeWindow,
        moveWindow,
        resizeWindow,
        //!unused
        maximiseWindow // function called on minimise, could be undefined 
    } = props;
    const  {
        windowsRef,
        closeWindow: closeThisWindow,
        windowToTop,
      } = useContext(WindowManagerContext);
    const maxSize = {
        width: '100%',
        height: '100%'
    }
    // ? width could be the width of title instead of min width
    const minimisedLocalSize = useMemo(()=>{ return { width: minSize.width, height: 18+2+2} }, [ minSize ]);
    // refs - values
    const offsetRef = useRef({top: 0, left: 0});

    const windowPrevPositionRef = useRef(undefined);
    const windowPrevSizeRef = useRef(undefined);

    const [ localZIndex, setLocalZIndex ] = useState(initialZIndex);
    const [ minimisedLocally, setMinimisedLocally ] = useState(false);
    const [ maximisedLocally, setMaximisedLocally ] = useState(false);
    return (
        <WindowFrame
            className={className}
            lockResize={ resizeWindow === 'disable' || minimisedLocally || maximisedLocally }
            onMouseDown={()=>{
                // TODO: check if zIndex is already top, if so do nothing;
                setLocalZIndex( windowToTop(id) );
            }}
            style={{
                zIndex: localZIndex,
                // TODO: use other means to disable resizing, and show correct cursor
                // ! resizing are disablled automatically via lockResize prop;
                minWidth: minimisedLocally
                    ? `${minimisedLocalSize.width }px`
                    : maximisedLocally
                        ? maxSize.width
                        : `${minSize.width}px`
                ,
                minHeight: minimisedLocally
                    ? `${minimisedLocalSize.height}px`
                    :  maximisedLocally
                        ? maxSize.height 
                        : `${minSize.height}px`
                ,
                maxWidth: minimisedLocally
                    ? `${minimisedLocalSize.width}px` 
                    : maxSize.width,
                maxHeight: minimisedLocally
                    ? `${minimisedLocalSize.height}px` 
                    : maxSize.height,
            }}
            initialPosition={initialPosition}
            initialSize={initialSize}
            renderContent={( useGridPosition, useGridSize) => {
                const [ gridPosition, setGridPosition ] = useGridPosition;
                const [ gridSize, setGridSize ] = useGridSize;
                return (<>
                    <div
                        className={`${css.top} rde-unselectable ${classNames?.top}`}
                    >
                        <div
                            className={`${css.top_left}`}
                        >
                            {/* local minimise here */}
                            { minimiseWindow === undefined //&& !maximisedLocally
                                ? <button
                                    className='rde-unselectable'
                                    onClick={()=>{
                                        if (!minimisedLocally) {
                                            windowPrevSizeRef.current = gridSize;
                                            // TODO: save window location
                                            setGridSize(minimisedLocalSize);
                                        } else {
                                            setGridSize(windowPrevSizeRef.current);
                                        }
                                        setMinimisedLocally(!minimisedLocally);
                                    }}
                                > 
                                    {minimisedLocally
                                        ? <span className={'rde-custom-font-symbols'}>{'='}</span>//<span className={'material-symbols-outlined rde-material-symbols-outlined'}>chevron_right</span>
                                        : <span className={'rde-custom-font-symbols'}>{'>'}</span>//<span className={'material-symbols-outlined rde-material-symbols-outlined'}>drag_handle</span>
                                    } 
                                </button> 
                                : null
                            }
                        </div>
                        <div
                            className={`${css.top_mid}`}
                            // * this disables drag when maximised.
                            draggable={maximisedLocally || moveWindow === 'disable' ? false : true}
                            onDragStart={(e)=>{
                                // console.log(e)
                                // setIsDragging(true);
                                offsetRef.current = {
                                    left: gridPosition.left - e.clientX, 
                                    top: gridPosition.top - e.clientY
                                }
                                const dragImg = document.querySelector('#dragImg');
                                e.dataTransfer.setDragImage(dragImg, 0, 0);
                            }}
                            onDrag={(e)=>{
                                if ( e.clientX !== 0 && e.clientY !== 0 ) {
                                    setGridPosition( {
                                        left: e.clientX + offsetRef.current.left, 
                                        top: e.clientY + offsetRef.current.top
                                    } )
                                }
                            }}
                            // below deoesnt affect behaviour, but performance increases
                            onDragLeave={(e)=>{
                                // prevent dragImage flyover when dropping
                                e.preventDefault();
                            }}
                            onDragOver={(e)=>{
                                // prevent dragImage flyover when dropping
                                e.preventDefault();
                            }}
                        >
                            {title}
                        </div>
                        <div
                            className={`${css.top_right} ${classNames?.top_right}`}
                        >
                            {/* minimise according to parent */}
                            { typeof minimiseWindow === 'function'
                                ? <button
                                    className='rde-unselectable'
                                    onClick={()=>{
                                        /**
                                         * minimise to bar behaviour 
                                         * not in useEffect becuase that would require another state to trigger useEffect. bundling both in one state is not as readable. 
                                         * perhaps move useEffect of locally minimise into onClick.. but then the code not be as clean haha maybe i will change my mine.
                                         */
                                        // save the window size
                                        // TODO
                                        // ? should maximised then minimised window restore to the state prior to maximisation
                                        // ?-cont. or should it be restored to the maximised state.
                                        // ?-cont. restoring to the state prior to maximisation for now becuase it is easier to impelment, and it does not intefere with UX (max state will block content)
                                        // * windowPrevSizeRef not used here because Window gets unmounted&remounted, so we need to modify the globalState (context)
                                        if ( maximiseWindow ) {
                                            // save the window size
                                            // TODO: monitor fullscreen
                                            const { width, height} = maximiseWindow();
                                        } else {
                                            if (!maximisedLocally) {
                                                windowsRef.current[id].props.initialSize = gridSize;
                                                windowsRef.current[id].props.initialPosition = gridPosition;
                                            } else {
                                                windowsRef.current[id].props.initialSize = windowPrevSizeRef.current;
                                                windowsRef.current[id].props.initialPosition = windowPrevPositionRef.current;
                                            }
                                        }
                                        minimiseWindow(id);
                                    }}
                                > 
                                    <span className={'rde-custom-font-symbols'}>-</span>
                                </button> 
                                : minimiseWindow === 'disable' || minimiseWindow === undefined
                                    ? null
                                    : null
                            }
                            {minimisedLocally || minimiseWindow === 'disable'
                                ? null
                                : <button
                                    className='rde-unselectable'
                                    onClick={()=>{
                                        if ( maximiseWindow ) {
                                            // save the window size
                                            // TODO: monitor fullscreen
                                            const { width, height} = maximiseWindow();
                                        } else {
                                            if (!maximisedLocally) {
                                                windowPrevSizeRef.current = gridSize;
                                                windowPrevPositionRef.current = gridPosition;
                                                setGridPosition({left:0, top:0});
                                                setGridSize(maxSize);
                                            } else {
                                                setGridPosition(windowPrevPositionRef.current)
                                                setGridSize(windowPrevSizeRef.current);
                                            }
                                            setMaximisedLocally(!maximisedLocally);
                                        }
                                    }}
                                >
                                    <span className={'material-symbols-outlined rde-material-symbols-outlined'}>{maximisedLocally? 'fullscreen_exit' : 'fullscreen'}</span>
                                </button>
                            }
                            { closeWindow === 'disable' 
                                ? null
                                : <button
                                    className='rde-unselectable'
                                    onClick={()=>{
                                        closeThisWindow(id);
                                    }}
                                >
                                    <span className={'material-symbols-outlined rde-material-symbols-outlined'}>close</span>
                                </button>
                            }
                        </div>
                    </div>
                    <div className={css.mid}>
                        { children }
                    </div>
                </>)
            }}
        />
    )
}

Window.defaultProps = {
    minSize: {
        width: 100,
        height: 100
    },
    // maxSize: {
    //     width: 'calc( 100% - 4px)',
    //     height: 'calc( 100% - 4px)',
    // }
}

// export function WindowBody({children, ...props}) {
//     return (
//         <div className={css.mid_body} {...props}>
//             { children }
//         </div>
//     )
// }

// Window.Body = WindowBody;