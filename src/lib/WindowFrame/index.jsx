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
// useEffect(()=>{
//     console.log(gridSize);
// },[gridSize])
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
    const onDragStartMousePositionRef = useRef({left: 0, top: 0});
    const onDragStartGridSizeRef = useRef(undefined);
    const onDragStartGridPositionRelativeToViewportRef = useRef(undefined);
    const onDragStartGridPositionRef = useRef(undefined);
    return (
        <div 
            className={ styles(grid[area].className, className, (lockResize? css['lock-resize'] : '') )}
            //
            draggable={ lockResize? false : true }
            onDragStart={(e)=>{

                    // initialise mouse position offset
                    // setIsDragging(true);
                    // ! mousePositionOffsetRef.current = {
                    //     left: gridPosition.left - e.clientX, 
                    //     top: gridPosition.top - e.clientY
                    // }
                    onDragStartMousePositionRef.current = {
                        left: e.clientX, 
                        top: e.clientY
                    }
                    onDragStartGridSizeRef.current = gridSize;
                    // * USE getBoundingClientRect() e.g. e.target.getBoundingClientRect().left
                    // this is used to calculate the correct size as the position we get is relative to the parent div
                    onDragStartGridPositionRelativeToViewportRef.current = {
                        left: e.target.getBoundingClientRect().left,
                        top: e.target.getBoundingClientRect().top
                    }
                    onDragStartGridPositionRef.current = gridPosition;
                    const dragImg = document.querySelector('#dragImg');
                    e.dataTransfer.setDragImage(dragImg, 0, 0);
                }
            }
            onDrag={(e)=>{
                    // calculate result position and size
                    // if statement prevent doing calculation on the last values which is going to be 0
                    if ( e.clientX !== 0 && e.clientY !== 0 ) {
                        setGridPosition( grid[area].calculatePosition( 
                            e, 
                            onDragStartMousePositionRef.current, 
                            onDragStartGridPositionRef.current
                        ));
                        setGridSize( grid[area].calculateSize( 
                            e, 
                            onDragStartGridSizeRef.current,
                            onDragStartGridPositionRelativeToViewportRef.current
                        ));
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
// * order by position clockwise
// TODO: add positionChange limit so window dont move when its at minSzie
// * USE getBoundingClientRect() e.g. e.target.getBoundingClientRect().left
const grid={
    'nw': {
        className: styles(css.t, css.l, css.gridMax, css['nwse-resize']),
        calculatePosition: ( e,  onDragStartMousePosition, onDragStartGridPosition )=>{ //gridPosition
            const positionChange = {
                left: e.clientX - onDragStartMousePosition.left, 
                top:  e.clientY - onDragStartMousePosition.top
            }
            return {    
                left: onDragStartGridPosition.left + positionChange.left, 
                top: onDragStartGridPosition.top + positionChange.top
            }
        },
        
        calculateSize: ( e, onDragStartGridSize, onDragStartGridPositionRelativeToViewport )=>{
            // onDragMousePosition almost=== gridPosition
            const sizeChange = {
                width: onDragStartGridPositionRelativeToViewport.left - e.clientX, 
                height: onDragStartGridPositionRelativeToViewport.top - e.clientY
            }

            return {
                width: onDragStartGridSize.width + sizeChange.width, //gridPosition.left - ( e.clientX + onDragMousePosition.left ) + gridSize.width, 
                height: onDragStartGridSize.height + sizeChange.height //gridPosition.top - ( e.clientY + onDragMousePosition.top ) + gridSize.height
            }
        }
    },
    'n': {
       className: styles(css.t, css.c, css.gridMax, css['ns-resize']),
       calculatePosition: ( e, onDragStartMousePosition, onDragStartGridPosition )=>{
            const positionChange = {
                left: 0, //e.clientX - onDragStartMousePosition.left, 
                top:  e.clientY - onDragStartMousePosition.top
            }
            return {    
                left: onDragStartGridPosition.left + positionChange.left, 
                top: onDragStartGridPosition.top + positionChange.top
            }
        },
        calculateSize: ( e, onDragStartGridSize, onDragStartGridPositionRelativeToViewport )=>{
            const sizeChange = {
                width: 0, 
                height: onDragStartGridPositionRelativeToViewport.top - e.clientY
            }
            return {
                width: onDragStartGridSize.width + sizeChange.width, //
                height: onDragStartGridSize.height + sizeChange.height //gridPosition.top - ( e.clientY + onDragStartPosition.top ) + gridSize.height
            }
        }
    },
    'ne': {
        className: styles(css.t, css.r, css.gridMax, css['nesw-resize']),
        calculatePosition: ( e, onDragStartMousePosition, onDragStartGridPosition )=>{
            const positionChange = {
                left: 0,
                top:  e.clientY - onDragStartMousePosition.top
            }
            return {    
                left: onDragStartGridPosition.left + positionChange.left, 
                top: onDragStartGridPosition.top + positionChange.top
            }
        },
        calculateSize: ( e, onDragStartGridSize, onDragStartGridPositionRelativeToViewport )=>{
            const sizeChange = {
                width: e.clientX - onDragStartGridPositionRelativeToViewport.left, 
                height: onDragStartGridPositionRelativeToViewport.top - e.clientY
            }
            return {
                width: onDragStartGridSize.width + sizeChange.width,
                height: onDragStartGridSize.height + sizeChange.height
            }
        }
    },
    'e': {
        className: styles(css.m, css.r, css.gridMax, css['ew-resize']),
        calculatePosition: ( e, onDragStartPosition, onDragStartGridPosition )=>{
            const positionChange = {
                left: 0, //e.clientX - onDragStartPosition.left, 
                top:  0 //e.clientY - onDragStartPosition.top
            }
            return {    
                left: onDragStartGridPosition.left + positionChange.left, 
                top: onDragStartGridPosition.top + positionChange.top
            }
        },
        calculateSize: ( e, onDragStartGridSize, onDragStartGridPositionRelativeToViewport )=>{
            const sizeChange = {
                width: e.clientX - onDragStartGridPositionRelativeToViewport.left, 
                height: 0 //gridPosition.top - e.clientY
            }
            return {
                width: onDragStartGridSize.width + sizeChange.width,
                height: onDragStartGridSize.height + sizeChange.height
            }
        }
    },
    'se': {
        className: styles(css.b, css.r, css.gridMax, css['nwse-resize']),
        calculatePosition: ( e, onDragStartPosition, onDragStartGridPosition )=>{
            const positionChange = {
                left: 0,
                top:  0
            }
            return {    
                left: onDragStartGridPosition.left + positionChange.left, 
                top: onDragStartGridPosition.top + positionChange.top
            }
        },
        calculateSize: ( e, onDragStartGridSize,onDragStartGridPositionRelativeToViewport )=>{
            const sizeChange = {
                width: e.clientX - onDragStartGridPositionRelativeToViewport.left, 
                height: e.clientY - onDragStartGridPositionRelativeToViewport.top, 
            }
            return {
                width: onDragStartGridSize.width + sizeChange.width,
                height: onDragStartGridSize.height + sizeChange.height
            }
        }
    },
    's': {
        className: styles(css.b, css.c, css.gridMax, css['ns-resize']),
        calculatePosition: ( e, onDragStartPosition, onDragStartGridPosition )=>{
            const positionChange = {
                left: 0,
                top:  0
            }
            return {    
                left: onDragStartGridPosition.left + positionChange.left, 
                top: onDragStartGridPosition.top + positionChange.top
            }
        },
        calculateSize: ( e, onDragStartGridSize, onDragStartGridPositionRelativeToViewport )=>{

            // console.log(onDragGridPositionOffsetViewport)
            const sizeChange = {
                width: 0, 
                height: e.clientY - onDragStartGridPositionRelativeToViewport.top, 
            }
            return {
                width: onDragStartGridSize.width + sizeChange.width,
                height: onDragStartGridSize.height + sizeChange.height
            }
        }
    },
    'sw': {
        className: styles(css.b, css.l, css.gridMax, css['nesw-resize']),
        calculatePosition: ( e, onDragStartMousePosition, onDragStartGridPosition )=>{
            const positionChange = {
                left: e.clientX - onDragStartMousePosition.left, 
                top:  0
            }
            return {    
                left: onDragStartGridPosition.left + positionChange.left, 
                top: onDragStartGridPosition.top + positionChange.top
            }
        },
        calculateSize: ( e, onDragStartGridSize, onDragStartGridPositionRelativeToViewport )=>{
            const sizeChange = {
                width: onDragStartGridPositionRelativeToViewport.left - e.clientX, 
                height: e.clientY - onDragStartGridPositionRelativeToViewport.top, 
            }
            return {
                width: onDragStartGridSize.width + sizeChange.width,
                height: onDragStartGridSize.height + sizeChange.height
            }
        }
    },
    'w': {
        className: styles(css.m, css.l, css.gridMax, css['ew-resize']),
        calculatePosition: ( e, onDragStartMousePosition, onDragStartGridPosition )=>{
            const positionChange = {
                left: e.clientX - onDragStartMousePosition.left, 
                top:  0
            }
            return {    
                left: onDragStartGridPosition.left + positionChange.left, 
                top: onDragStartGridPosition.top + positionChange.top
            }
        },
        calculateSize: ( e, onDragStartGridSize, onDragStartGridPositionRelativeToViewport )=>{
            const sizeChange = {
                width: onDragStartGridPositionRelativeToViewport.left - e.clientX, 
                height: 0, 
            }
            return {
                width: onDragStartGridSize.width + sizeChange.width,
                height: onDragStartGridSize.height + sizeChange.height
            }
        }
    },
    'body': {
        className: styles(css.m, css.c, css.gridMaxBody),
    },
    



}