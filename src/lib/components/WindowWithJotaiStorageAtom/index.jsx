// import Window from "../Window";
// import css from './index.module.css';
import { useEffect, useState, useMemo, useContext } from "react";
import {  WindowManagerContext, Window, Desktop, SpawnWindowButton, rde } from '../../../lib';

export default function WindowWithJotaiStorageAtom({id, initialZIndex, className, classNames, style, onClick, ...props}){
    // userinput from createWindow
    const { initialTitle, initialPosition, initialSize, minSize, minimiseWindow, children, closeWindow, moveWindow, resizeWindow } = props;
    // for closing windows
    const { helpers } = useContext(WindowManagerContext)
    const childrenNodes = helpers.getWindowsByParentId(id);

    return (
        <Window {...{id, initialZIndex, className, classNames, style, onClick}}
            // userinput from createWindow
            initialPosition={initialPosition}
            initialSize={initialSize}
            /* 'local', 'disable', minimiseFunction */
            minimiseWindow = {minimiseWindow }
            closeWindow={ rde.onWindowClose(id,  childrenNodes) }
            // // moveWindow={moveWindow}
            // // resizeWindow={resizeWindow}
            // local values.
            title={initialTitle}
            minSize={minSize}
        >
            {children}
        </Window>

    )
}