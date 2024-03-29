/**
 * basic Window component that is meant ot be wrapped into preset Window
 */
import css from './index.module.css';
import { useState, useEffect, useRef, useContext } from 'react';
import DraggbleResizableFrame from '../frames/DraggbleResizableFrame';
import { useWindowManagerContext } from '../../hooks/useContext';

export default function WindowFrame({children, className, style, onClick, ...props}){
    const {
        liftWindowToTop, hideWindow, closeWindow,
        // parentId,
        initialTitle,
        initialPosition,
        initialSize,
        minSize,
        lockResize,
        //
        classNames,
    } = props;

    const {
        // currentWindowId,
        // useWindowState,
        initWindowState,
        syncWindowState,
        // states,
        setWindowState,
        getWindowStates
    }= useWindowManagerContext();

    const offsetRef = useRef({top: 0, left: 0});
    const windowPositionRef = useRef(initWindowState('gridPosition',initialPosition));
    const windowSizeRef = useRef(initWindowState('gridSize',initialSize));

    const [ isMaximisedLocally, setIsMaximisedLocally] = useState(
        windowSizeRef.current.width === 'max' &&  windowSizeRef.current.height === 'max'
    );
    const [ isMinimisedLocally, setIsMinimisedLocally ] = useState(false);

// //
//     const gridSizeBeforeMaximisationRef = useRef(gridSizeWithContext);
//     const gridPositionBeforeMaximisationRef = useRef(gridPositionWithContext);

    const minimisedLocalSize = { width: minSize.width, height: 18 + 2 + 2};

    // const gridSizeBeforeMinimisationRef = useRef(gridSizeWithContext);
    // const gridPositionBeforeMinimisationRef = useRef(gridPositionWithContext);

    return (
        <DraggbleResizableFrame
            className={className}
            // lockResize={ resizeWindow === 'disable' || minimisedLocally || maximisedLocally }
            onMouseDown={()=>{
                liftWindowToTop
                    ? liftWindowToTop()
                    : null
                ;
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
            lockResize={lockResize? true : isMaximisedLocally}
            runAfterResize={syncWindowState}
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
                            {!hideWindow && <button className='rde-unselectable' style={{width:'16px', height:'16px'}}
                                onClick={()=>{
                                    syncWindowState();
                                    if ( isMinimisedLocally ) {
                                        setIsMinimisedLocally(false);
                                        setGridSize( windowPositionRef.current );
                                    } else {
                                        setIsMinimisedLocally(true);
                                        windowPositionRef.current = gridSize;
                                        setGridSize( minimisedLocalSize );
                                    }

                                }}
                            >
                                {isMinimisedLocally
                                    ? <span className={'material-symbols-outlined rde-material-symbols-outlined'}>{'navigate_next'}</span>
                                    : <span className={'material-symbols-outlined rde-material-symbols-outlined'} style={{
                                        fontVariationSettings: `
                                            'FILL' 0,
                                            'wght' 500,
                                            'GRAD' 0,
                                            'opsz' 0
                                        `,
                                        fontSize: '12px'
                                    }}>{ 'equal' }</span>
                                }
                            </button>}
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
                            onDragEnd={(e)=>{
                                e.preventDefault();
                                syncWindowState(); 
                            }}
                        >
                            {/* {title} */}
                            {initialTitle}
                        </div>
                        <div className={`${css.top_right} ${classNames?.top_right}`}>
                            { hideWindow && <button className='rde-unselectable'
                                onClick={()=>{
                                    syncWindowState();
                                    if ( isMinimisedLocally ){
                                        
                                        setIsMinimisedLocally(false);
                                    } else {
                                        
                                        setIsMinimisedLocally(true);
                                    }
                                    hideWindow();
                                }}
                            > 
                                <span className={'rde-custom-font-symbols'}>-</span>
                            </button>} 
                            <button className='rde-unselectable'
                                onClick={()=>{
                                    if ( isMaximisedLocally ){
                                        setGridPosition(  windowPositionRef.current);
                                        setGridSize( windowSizeRef.current );
                                        //
                                        setIsMaximisedLocally(false);
                                    } else {
                                        windowSizeRef.current = gridSize;
                                        windowPositionRef.current = gridPosition;
                                        // setWindowState('gridSizeBeforeMaximisation', gridSize);
                                        // setWindowState('gridPositionBeforeMaximisation', gridPosition);
                                        setGridPosition({left:0, top:0});
                                        setGridSize({ width: 'max', height: 'max'});
                                        setIsMaximisedLocally(true);
                                    }
                                }}
                            > 
                                <span className={'material-symbols-outlined rde-material-symbols-outlined'}>{ isMaximisedLocally ? 'fullscreen_exit' : 'fullscreen'}</span>
                            </button> 
                            {closeWindow && <button className='rde-unselectable'
                                onClick={()=>{
                                    closeWindow();
                                }}
                            > 
                                <span className={'material-symbols-outlined rde-material-symbols-outlined'}>{'close'}</span>
                            </button>}
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

WindowFrame.defaultProps = {
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