import { createContext, useEffect, useRef } from "react";
import { htmlToElement } from "../utils";

export const DesktopEnvironmentContext = createContext({components:{}});
DesktopEnvironmentContext.displayName = 'DesktopEnvironmentContext';

export default function DesktopEnvironmentProvider({components, children}){
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
            /* google matirial icon font */
            @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200');
            /* chinese font  */
            @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@100;300;400;500;700;900&display=swap');
            /*
            google fonts inconsolata 
            font-family: 'Inconsolata', monospace; 
            */
            @import url('https://fonts.googleapis.com/css2?family=Inconsolata:wght@200;300;400;500;600;700;800;900&display=swap');
            
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
                font-size: 14px;
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

    const value = { 
        components
    }
    return(
        <DesktopEnvironmentContext.Provider value={value}>
            {children}
        </DesktopEnvironmentContext.Provider>
    )
}