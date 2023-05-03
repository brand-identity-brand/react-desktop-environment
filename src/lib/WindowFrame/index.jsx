import css from './index.module.css';
import {styles} from '../utils';
import { useRef, useEffect, useState } from 'react';

export default function WindowFrame({children, className, style, onMouseDown, ...props}){
    const {
        lockResize, //bool
        initialPosition,
        initialSize,
        renderContent
    } = props;
    const gridRef = useRef();
    const [ gridPosition, setGridPosition ] = useState(initialPosition);
    const [ gridSize, setGridSize ] = useState(initialSize);

    // const mousePositionOffsetRef = useRef({left: 0, top: 0});

    return (
        <div
            ref={gridRef}
            className={styles(className, css.windowGrid)}
            style={{
                ...style,
                top: `${gridPosition.top}px`,
                left: `${gridPosition.left}px`,
                width: `${gridSize.width}px`,
                height: `${gridSize.height}px`,
            }}
            onMouseDown={onMouseDown}
        >
            <Area 
                lockResize={lockResize}
                area={'nw'}
                useGridPosition={[ gridPosition, setGridPosition ]}
                useGridSize={[ gridSize, setGridSize ]}
                onResize={()=>{}}
            />
            <Area 
                lockResize={lockResize}
                area={'n'}
                useGridPosition={[ gridPosition, setGridPosition ]}
                useGridSize={[ gridSize, setGridSize ]}
            />
            <Area 
                lockResize={lockResize}
                area={'ne'}
                useGridPosition={[ gridPosition, setGridPosition ]}
                useGridSize={[ gridSize, setGridSize ]}
            />
            <Area 
                lockResize={lockResize}
                area={'w'}
                useGridPosition={[ gridPosition, setGridPosition ]}
                useGridSize={[ gridSize, setGridSize ]}
            />
            <div
                className={grid['body'].className}
            >
               { renderContent([ gridPosition, setGridPosition ], [ gridSize, setGridSize ]) }
            </div>
            <Area 
                lockResize={lockResize}
                area={'e'}
                useGridPosition={[ gridPosition, setGridPosition ]}
                useGridSize={[ gridSize, setGridSize ]}
            />
            <Area 
                lockResize={lockResize}
                area={'sw'}
                useGridPosition={[ gridPosition, setGridPosition ]}
                useGridSize={[ gridSize, setGridSize ]}
            />
            <Area 
                lockResize={lockResize}
                area={'s'}
                useGridPosition={[ gridPosition, setGridPosition ]}
                useGridSize={[ gridSize, setGridSize ]}
            />
            <Area 
                lockResize={lockResize}
                area={'se'}
                useGridPosition={[ gridPosition, setGridPosition ]}
                useGridSize={[ gridSize, setGridSize ]}
            />
        </div>
    )
};

WindowFrame.defaultProps = {
    className: '',
    style: {},
    initialPosition: {
        left: 0,
        top: 0
    },
    initialSize: {
        width: 100,
        height: 100
    }
}

function Area({className, style, children, ...props}) {
    const {
        lockResize,
        area,
        useGridPosition,
        useGridSize,
    } = props;
    const [ gridPosition, setGridPosition ] = useGridPosition;
    const [ gridSize, setGridSize ] = useGridSize;

    /**
     * mouse position relative to browser viewport: e.clientX,  e.clientY
     */
    const mousePositionOffsetRef = useRef({left: 0, top: 0});
    return (
        <div 
            className={ styles(grid[area].className, className, (lockResize? css['lock-resize'] : '') )}
            //
            draggable={ lockResize? false : true }
            onDragStart={(e)=>{
                    // initialise mouse position offset
                    // setIsDragging(true);
                    mousePositionOffsetRef.current = {
                        left: gridPosition.left - e.clientX, 
                        top: gridPosition.top - e.clientY
                    }
                    const dragImg = document.querySelector('#dragImg');
                    e.dataTransfer.setDragImage(dragImg, 0, 0);
                }
            }
            onDrag={(e)=>{
                    // calculate result position and size
                    // if statement prevent doing calculation on the last values which is going to be 0
                    if ( e.clientX !== 0 && e.clientY !== 0 ) {
                        // mousePositionOffsetRef.current = {
                        //     left: gridPosition.left - e.clientX, 
                        //     top: gridPosition.top - e.clientY
                        // }
                        setGridPosition( grid[area].calculatePosition(e, mousePositionOffsetRef.current, gridPosition));
                        setGridSize( grid[area]. calculateSize( e, mousePositionOffsetRef.current, gridPosition, gridSize ));
                    }
                }
            }
        >
            {children}
        </div>
    )
}
// mousePositionOffset
// windowLeft - mouseLeft, 
// windowTop - mouseTop
// ! nested windows dont resize properly, mostlikely offset problems
const grid={
    'nw': {
        className: styles(css.t, css.l, css.gridMax, css['nwse-resize']),
        calculatePosition: ( e, mousePositionOffset )=>{ //gridPosition
            return {    
                left: e.clientX +  mousePositionOffset.left, 
                top: e.clientY +  mousePositionOffset.top
            }
        },
        calculateSize: ( e, mousePositionOffset, gridPosition, gridSize )=>{
            return {
                width: gridPosition.left - ( e.clientX + mousePositionOffset.left ) + gridSize.width, 
                height: gridPosition.top - ( e.clientY + mousePositionOffset.top ) + gridSize.height
            }
        }
    },
    'n': {
       className: styles(css.t, css.c, css.gridMax, css['ns-resize']),
       calculatePosition: ( e, mousePositionOffset, gridPosition )=>{
            return {    
                left: gridPosition.left, 
                top: e.clientY +  mousePositionOffset.top
            }
        },
        calculateSize: ( e, mousePositionOffset, gridPosition, gridSize )=>{
            return {
                width: gridSize.width, 
                height: gridPosition.top - ( e.clientY + mousePositionOffset.top ) + gridSize.height
            }
        }
    },
    'ne': {
        className: styles(css.t, css.r, css.gridMax, css['nesw-resize']),
        calculatePosition: ( e, mousePositionOffset, gridPosition )=>{
            return {    
                left: gridPosition.left,
                top: e.clientY +  mousePositionOffset.top
            }
        },
        calculateSize: ( e, mousePositionOffset, gridPosition, gridSize )=>{
            // console.log( mousePositionOffset.left , gridSize.width )
            // console.log(e.clientX)
            // ! offset missing, but inaccruacy is barely noticable
            // TODO: figure out mouse offset
            return {
                width: ( e.clientX ) - gridPosition.left, 
                height: gridPosition.top - ( e.clientY + mousePositionOffset.top ) + gridSize.height
            }
        }
    },
    'w': {
        className: styles(css.m, css.l, css.gridMax, css['ew-resize']),
        calculatePosition: ( e, mousePositionOffset, gridPosition )=>{
            return {    
                left: e.clientX +  mousePositionOffset.left, 
                top: gridPosition.top,
            }
        },
        calculateSize: ( e, mousePositionOffset, gridPosition, gridSize )=>{
            return {
                width: gridPosition.left - ( e.clientX + mousePositionOffset.left ) + gridSize.width, 
                height: gridSize.height
            }
        }
    },
    'body': {
        className: styles(css.m, css.c, css.gridMaxBody),
    },
    'e': {
        className: styles(css.m, css.r, css.gridMax, css['ew-resize']),
        calculatePosition: ( e, mousePositionOffset, gridPosition )=>{
            return {    
                left: gridPosition.left,
                top: gridPosition.top,
            }
        },
        calculateSize: ( e, mousePositionOffset, gridPosition, gridSize )=>{
            // ! offset missing, but inaccruacy is barely noticable
            // TODO: figure out mouse offset
            return {
                width: ( e.clientX ) - gridPosition.left, 
                height: gridSize.height
            }
        }
    },
    'se': {
        className: styles(css.b, css.r, css.gridMax, css['nwse-resize']),
        calculatePosition: ( e, mousePositionOffset, gridPosition )=>{
            return {    
                left: gridPosition.left,
                top: gridPosition.top,
            }
        },
        calculateSize: ( e, mousePositionOffset, gridPosition, gridSize )=>{
            // ! offset missing, but inaccruacy is barely noticable
            // TODO: figure out mouse offset
            return {
                width: ( e.clientX ) - gridPosition.left, 
                height: ( e.clientY ) - gridPosition.top, 
            }
        }
    },
    's': {
        className: styles(css.b, css.c, css.gridMax, css['ns-resize']),
        calculatePosition: ( e, mousePositionOffset, gridPosition )=>{
            return {    
                left: gridPosition.left,
                top: gridPosition.top,
            }
        },
        calculateSize: ( e, mousePositionOffset, gridPosition, gridSize )=>{
            // ! offset missing, but inaccruacy is barely noticable
            // TODO: figure out mouse offset
            return {
                width: gridSize.width, 
                height: ( e.clientY ) - gridPosition.top, 
            }
        }
    },
    'sw': {
        className: styles(css.b, css.l, css.gridMax, css['nesw-resize']),
        calculatePosition: ( e, mousePositionOffset, gridPosition )=>{
            return {    
                left: e.clientX +  mousePositionOffset.left, 
                top: gridPosition.top,
            }
        },
        calculateSize: ( e, mousePositionOffset, gridPosition, gridSize )=>{
            // ! offset missing, but inaccruacy is barely noticable
            // TODO: figure out mouse offset
            return {
                width: gridPosition.left - ( e.clientX + mousePositionOffset.left ) + gridSize.width, 
                height: ( e.clientY ) - gridPosition.top, 
            }
        }
    }
}