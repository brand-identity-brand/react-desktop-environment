import WindowManagerContextProvider, { WindowManagerContext } from 'react-window-manager';
import { createContext, useState, useEffect, useRef } from "react";
import { htmlToElement } from "../utils";

const DesktopEnvironmentContext = createContext(null);
export {
    WindowManagerContext,
    DesktopEnvironmentContext
}

export default function DesktopEnvironmentContextProvider({children}){
    // create and empty img element for drag img
    //TODO: import '@/node_modules/react-desktop-environment/dist/style.css';
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
            @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200');

            .rde-display-none { 
                display: none !important; 
            }
            .rde-unselectable {
                -webkit-touch-callout: none !important;
                -webkit-user-select: none !important; 
                -khtml-user-select: none !important; 
                -moz-user-select: none !important; 
                -ms-user-select: none !important; 
                user-select: none !important; 
            }

            .rde-material-symbols-outlined {
                font-size: 16px;
                font-variation-settings:
                    'FILL' 0,
                    'wght' 600,
                    'GRAD' 0,
                    'opsz' 24
                
            }
            .rde-custom-font-symbols {
                line-height: 20px;
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
