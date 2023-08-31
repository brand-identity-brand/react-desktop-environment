/**
 * basic Window component that is meant ot be wrapped into preset Window
 */
import css from './index.module.css';
import { useState, useEffect, useRef, useContext, useMemo } from 'react';
import { WindowManagerContext } from 'react-window-manager';
import WindowFrame from '../WindowFrame';

export default function Window({children, className, style, onClick, ...props}){
    const {
        liftWindowToTop, hideWindow, unhideWindow, closeWindow,
        parentId,
        initialTitle,
        initialPosition,
        initialSize,
        minSize,
        //
        classNames,
        onMinimise,
    } = props;

    const { id, isWindowStatesReady, setWindowState, getWindowState, getWindowWindow }= useContext(WindowManagerContext);

    const offsetRef = useRef({top: 0, left: 0});
    const windowPositionRef = useRef(initialPosition);
    const windowSizeRef = useRef(initialSize);

    if ( isWindowStatesReady(['gridSize','gridPosition'])  ) {
        windowPositionRef.current = getWindowState('gridPosition');
        windowSizeRef.current = getWindowState('gridSize');
    } 
    const [ isMaximisedLocally, setIsMaximisedLocally] = useState(
        windowSizeRef.current.width === 'max' &&  windowSizeRef.current.height === 'max'
    );
    const [ isMinimisedLocally, setIsMinimisedLocally ] = useState(false);
    return (
        <WindowFrame
            className={className}
            // lockResize={ resizeWindow === 'disable' || minimisedLocally || maximisedLocally }
            onMouseDown={()=>{
                liftWindowToTop(id);
                setWindowState('clicked minimise', 'clicked');
            }}
            style={{
            //     // TODO: use other means to disable resizing, and show correct cursor
            //     // ! resizing are disablled automatically via lockResize prop;
                minWidth: isMinimisedLocally
                    ? `${minimisedLocalSize.width }px`
                    : isMaximisedLocally
                        ? '100%'
                        : `${minSize.width}px`
                ,
                minHeight: isMinimisedLocally
                    ? `${minimisedLocalSize.height}px`
                    :  isMaximisedLocally
                        ? '100%'
                        : `${minSize.height}px`
            //     ,
            //     maxWidth: minimisedLocally
            //         ? `${minimisedLocalSize.width}px` 
            //         : maxSize.width,
            //     maxHeight: minimisedLocally
            //         ? `${minimisedLocalSize.height}px` 
            //         : maxSize.height,
            }}
            initialPosition={windowPositionRef.current}
            initialSize={windowSizeRef.current}
            lockResize={isMaximisedLocally}
            renderContent={( useGridPosition, useGridSize) => {
                
                const [ gridPosition, setGridPosition ] = useGridPosition;
                const [ gridSize, setGridSize ] = useGridSize;

                // TODO: move all position and size changes here. 
                useEffect(()=>{
                    setWindowState('gridSize', gridSize);
                    
                },[gridSize])
                useEffect(()=>{
                    setWindowState('gridPosition', gridPosition);

                },[gridPosition])

                return (<>
                    <div className={`${css.top} rde-unselectable ${classNames?.top}`}>
                        <div className={`${css.top_left}`}>
                        </div>
                        <div className={`${css.top_mid}`}
                            // * this disables drag when maximised.
                            draggable={isMaximisedLocally? false : true}
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
                            {initialTitle}
                        </div>
                        <div className={`${css.top_right} ${classNames?.top_right}`}>
                            <button className='rde-unselectable'
                                onClick={()=>{
                                    hideWindow(id);
                                }}
                            > 
                                <span className={'rde-custom-font-symbols'}>-</span>
                            </button> 
                            <button className='rde-unselectable'
                                onClick={()=>{
                                    if ( isMaximisedLocally ){
                                        setGridPosition( getWindowState('gridPositionBeforeMaximisation') );
                                        setGridSize( getWindowState('gridSizeBeforeMaximisation') );
                                        setIsMaximisedLocally(false);
                                    } else {
                                        setWindowState('gridSizeBeforeMaximisation', gridSize);
                                        setWindowState('gridPositionBeforeMaximisation', gridPosition);
                                        setGridPosition({left:0, top:0});
                                        setGridSize({ width: 'max', height: 'max'});
                                        setIsMaximisedLocally(true);
                                    }
                                }}
                            > 
                                <span className={'material-symbols-outlined rde-material-symbols-outlined'}>{ isMaximisedLocally ? 'fullscreen_exit' : 'fullscreen'}</span>
                            </button> 
                            <button className='rde-unselectable'
                                onClick={()=>{
                                    closeWindow(id);
                                }}
                            > 
                                <span className={'material-symbols-outlined rde-material-symbols-outlined'}>{'close'}</span>
                            </button> 
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
        width: 300,
        height: 200
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
//  
// }

// Window.Body = WindowBody;

// function TopBarMid