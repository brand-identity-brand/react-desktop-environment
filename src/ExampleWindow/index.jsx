import css from './index.module.css';
import { useEffect, useState, useMemo } from "react";
import { Window, Desktop, SpawnWindowButton, rde } from "../lib";
// import { RESET } from 'jotai/utils';


export default function ExampleWindow({...props}){
    // autofilled from createWindow 
    const { id, initialZIndex } = props;
    // userinput from createWindow
    const { initialPosition, initialSize, minSize, minimiseWindow, closeWindow, moveWindow, resizeWindow } = props;


    // new
    const defaultCounter = useMemo( ()=>rde.atom(id,'count',0), []);
    const [ count, setCount ] = rde.useAtom(defaultCounter);
    const defaultTitle = useMemo( ()=>rde.atom(id,'title', `count = ${count}`), [count]);
    const [ title, setTitle ] = rde.useAtom(defaultTitle);
    // const closeWindowP = onWindowClose([setCount, setTitle]);

    useEffect(()=>{ 
        console.log('counted');
        setTitle(`count = ${count}`);
    },[count]);
    // old
    // const [ count, setCount ] = useState(0);
    // const [ title, setTitle ] = useState(`count = ${count}`);
    
    // useEffect(()=>{ setTitle(`count = ${count}`) },[count]);

// windowsRef.current[id].closeWindow
/* windowsRef.current[id].states = []*/
    return (
        <Window
            // autofilled from createWindow 
            id={id}
            initialZIndex={initialZIndex}
            // userinput from createWindow
            initialPosition={initialPosition}
            initialSize={initialSize}
            /* 'local', 'disable', minimiseFunction */
            minimiseWindow = {minimiseWindow }
            closeWindow={ rde.onWindowClose([setCount, setTitle]) }//{closeWindowP} // TODO priotiy: insert this to widowsRef[id].current
            moveWindow={moveWindow}
            resizeWindow={resizeWindow}
            // local values.
            title={title}
            minSize={minSize}
        >
            < Desktop
                id={id}
                className={css.content}
            >
                <button
                    onClick={()=>{ setCount( count => count + 1 )}}
                >
                    count + 1
                </button>
                <br/>
                <SpawnWindowButton
                    Component={ExampleWindow}
                    minimiseWindow= {(id) => {  minimiseWindow(id); }}
                    // minimiseWindow= {'disable'}
                    // moveWindow={'disable'}
                    // closeWindow={'disable'}
                    // resizeWindow={'disable'}
                    parentWindowId={id}
                >
                    + example window
                </SpawnWindowButton>
            </Desktop>
        </Window>

    )
}

ExampleWindow.defaultProps={
    initialPosition: {left: 100, top: 50}, 
    initialSize: {width: 545, height: 150},
    minSize: {width: 345, height: 150}
}