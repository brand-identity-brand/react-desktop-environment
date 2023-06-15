import { useAtom as jotaiUseAtom} from 'jotai';
import {  RESET, atomWithStorage, createJSONStorage } from 'jotai/utils';

export function atom(windowId, key, value){
    const item = localStorage.getItem(windowId);
    const parsedItem = JSON.parse(item);
    return atomWithStorage(key, value, {
        
        getItem(stateTitle, initialValue){
            if ( parsedItem === null ) return initialValue;
            if ( parsedItem.hasOwnProperty(stateTitle) ) {
                return parsedItem[stateTitle];   
            }
        },
        setItem(stateTitle, value){
            if ( parsedItem === null ) {
                localStorage.setItem(windowId, JSON.stringify( { [stateTitle]: value }) );
            } else {
                parsedItem[stateTitle] = value;
                localStorage.setItem(windowId, JSON.stringify( parsedItem ));
            }
        },
        removeItem(stateTitle){
            delete parsedItem[stateTitle];
            localStorage.setItem(windowId, JSON.stringify(parsedItem));
        }
    });
}
export function useAtom(atom){
    return jotaiUseAtom(atom)
}

/**
 * returns a function that clears internal states of a window according to 
 * windowId => the window being closed
 * childrenNodes => the entire subTree of windowTd
 * 
 * idExtractor flattens the subTree and put all ids into an array.
 * 
 * @param {*} setters 
 * @returns 
 */
export function onWindowClose(windowId, childrenNodes){
    // ! duplicated from react-window-manager
    function idExtractor(obj, result=[]){ //obj = childrenNodes
        const keys = Object.keys(obj);
        const values = Object.values(obj);
        const nextValues = values.reduce( (accum, curr)=>{
          return Object.keys(curr).length > 0
              ? {...accum, ...curr}
                : accum
        },{});
        const newResult = [...result, ...keys];
        if ( Object.keys(nextValues).length > 0 ) {
            // console.log('next',newResult)
            return idExtractor(nextValues, newResult)
        }
        // console.log('end',newResult)
        return newResult;
    }
    return ()=>{ 
        const idsToBeDeleted = idExtractor(childrenNodes);
        idsToBeDeleted.forEach( id => localStorage.removeItem(id));
        localStorage.removeItem(windowId);
    }
}