/**
 * basic Window component that is meant ot be wrapped into preset Window
 */
import css from './index.module.css';
import { useState, useEffect, useRef, useMemo } from 'react';
import DraggbleResizableFrame from '../DraggbleResizableFrame';

export default function WindowFrame({children, className, style, onClick, ...props}){
    const {
        // syncWindowState=()=>{},
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

    // const [ title, setTitle ] = Array.isArray(initialTitle)? initialTitle : [ initialTitle, ()=>{}];
    const [ gridPositionWithContext, setGridPositionWithContext ] = useMemo(()=>Array.isArray(initialPosition)
        ? initialPosition 
        : [ initialPosition, ()=>{}]
    ,[])
    const [ gridSizeWithContext, setGridSizeWithContext ] = useMemo(()=>Array.isArray(initialSize)
        ? initialSize 
        : [ initialSize, ()=>{}]
    ,[])

    const offsetRef = useRef({top: 0, left: 0});
    // const windowPositionRef = useRef(initialPosition);
    // const windowSizeRef = useRef(initialSize);

    // if ( isWindowStatesReady(['gridSize','gridPosition'])  ) {
    //     windowPositionRef.current = getWindowState('gridPosition');
    //     windowSizeRef.current = getWindowState('gridSize');
    // } 

    const [ isMaximisedLocally, setIsMaximisedLocally] = useState(
        gridSizeWithContext.width === 'max' &&  gridSizeWithContext.height === 'max'
    );
    const [ isMinimisedLocally, setIsMinimisedLocally ] = useState(false);

    const gridSizeBeforeMaximisationRef = useRef(gridSizeWithContext);
    const gridPositionBeforeMaximisationRef = useRef(gridPositionWithContext);

    const minimisedLocalSize = { width: minSize.width, height: 18 + 2 + 2};

    const gridSizeBeforeMinimisationRef = useRef(gridSizeWithContext);
    const gridPositionBeforeMinimisationRef = useRef(gridPositionWithContext);

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
            initialPosition={gridPositionWithContext}
            initialSize={gridSizeWithContext}
            lockResize={lockResize? true : isMaximisedLocally}
            // runAfterResize={syncWindowState}
            renderContent={( useGridPosition, useGridSize) => {
                
                const [ gridPosition, setGridPosition ] = useGridPosition;
                const [ gridSize, setGridSize ] = useGridSize;

                // TODO: move all position and size changes here. 
                useEffect(()=>{
                    setGridSizeWithContext( gridSize);
                },[gridSize])
                useEffect(()=>{
                    setGridPositionWithContext( gridPosition );
                },[gridPosition])

                return (<>
                    <div className={`${css.top} rde-unselectable ${classNames?.top}`}>
                        <div className={`${css.top_left}`} style={{
                            // TODO: this causes problem in Next as client and server doesnt match
                            backgroundColor: hideWindow===undefined? '' : 'black', // this element is on the top level. omit bkgd colour or set zindex or set border
                            color: hideWindow===undefined? 'black' : 'white'
                        }}>
                            {!hideWindow && <button className='rde-unselectable' style={{width:'14px', height:'14px'}}
                                onClick={()=>{
                                    // syncWindowState();
                                    if ( isMinimisedLocally ) {
                                        setIsMinimisedLocally(false);
                                        setGridSize( gridSizeBeforeMinimisationRef.current );
                                    } else {
                                        setIsMinimisedLocally(true);
                                        gridSizeBeforeMinimisationRef.current = gridSize;
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
                        <div className={`${css.top_mid}`} style={{
                            backgroundColor:  'black',
                            color: 'white'
                        }}
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
                                // syncWindowState(); 
                            }}
                        >
                            {/* {title} */}
                            {initialTitle}
                        </div>
                        <div className={`${css.top_right} ${classNames?.top_right}`}>
                            { hideWindow && <button className='rde-unselectable'
                                onClick={()=>{
                                    // syncWindowState();
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
                                        setGridPosition(  gridPositionBeforeMaximisationRef.current);
                                        setGridSize( gridSizeBeforeMaximisationRef.current );
                                        //
                                        setIsMaximisedLocally(false);
                                    } else {
                                        gridSizeBeforeMaximisationRef.current = gridSize;
                                        gridPositionBeforeMaximisationRef.current = gridPosition;
                                        // setWindowState('gridSizeBeforeMaximisation', gridSize);
                                        // setWindowState('gridPositionBeforeMaximisation', gridPosition);
                                        setGridPosition({left:0, top:0});
                                        setGridSize({ width: 'max', height: 'max'});
                                        setIsMaximisedLocally(true);
                                    }
                                }}
                            > 
                                <span className={'material-symbols-outlined rde-material-symbols-outlined'} style={{fontSize:'12px'}}>{ isMaximisedLocally ? 'fullscreen_exit' : 'fullscreen'}</span>
                            </button> 
                            {closeWindow && <button className='rde-unselectable'
                                onClick={()=>{
                                    closeWindow();
                                }}
                            > 
                                <span className={`material-symbols-outlined rde-material-symbols-outlined ${css.close_span}`} >{'close'}</span>
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

// export function WindowBody({children, ...props}) {
//     return (
//         <div className={css.mid_body} {...props}>
//             { children }
//         </div>
//  
// }

// Window.Body = WindowBody;

// function TopBarMid