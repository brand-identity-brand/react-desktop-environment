import WindowManagerContextProvider, { WindowManagerContext } from 'react-window-manager';
import { createContext, useState, useEffect, useRef } from "react";
import { htmlToElement } from "./utils";

const DesktopEnvironmentContext = createContext(null);
export {
    WindowManagerContext,
    DesktopEnvironmentContext
}

export default function DesktopEnvironmentContextProvider({children}){
    // create and empty img element for drag img
    useEffect(()=>{
        /* append an empty image to body if it doesnt exist */
        if ( !document.getElementById('dragImg') ){
            const img = htmlToElement( /* HTML */ `
                <img 
                    id='dragImg' 
                    alt='' 
                    src='data:image/png;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
                />
            `)
            document.body.append(img);
        }
        // * https://stackoverflow.com/questions/524696/how-to-create-a-style-tag-with-javascript
        const css = `
            .rde-display-none { 
                display: none; 
            }
            .rde-unselectable {
                -webkit-touch-callout: none;
                -webkit-user-select: none;
                -khtml-user-select: none;
                -moz-user-select: none;
                -ms-user-select: none;
                user-select: none;
            }
        `;
        const head = document.head || document.getElementsByTagName('head')[0];
        const style = document.createElement('style');
        style.appendChild(document.createTextNode(css));
        head.appendChild(style);
    },[]);

    const value = null;

    return(
        <WindowManagerContextProvider>
            <DesktopEnvironmentContext.Provider value={value}>
                {children}
            </DesktopEnvironmentContext.Provider>
        </WindowManagerContextProvider>
    )
}

/**
 * <DesktopEnviornmentProvider>
 *     <WindowManagerContextProvider>
 *          <App/>
 *     </WindowManagerContextProvider>
 * </DesktopEnviornmentProvider>
 */
