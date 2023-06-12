import { useAtom as jotaiUseAtom} from 'jotai';
import {  RESET, atomWithStorage, createJSONStorage } from 'jotai/utils';

export function atom(windowId, key, value){
    return atomWithStorage(`${windowId}-${key}`, value);
}
export function useAtom(atom){
    return jotaiUseAtom(atom)
}

/**
 * returns a function that clears internal states of a window according to 
 * an array of setters from jotai storageAtom
 * 
 * @param {*} setters 
 * @returns 
 */
export function onWindowClose(setters=[]){
    return ()=>{setters.forEach( setter => setter(RESET) )}
}
// const storage = {
//   getItem(key, initialValue) {
//     const storedValue = localStorage.getItem(key)
//     try {
//       return myNumberSchema.parse(JSON.parse(storedValue ?? ''))
//     } catch {
//       return initialValue
//     }
//   },
//   setItem(key, value) {
//     localStorage.setItem(key, JSON.stringify(value))
//   },
//   removeItem(key) {
//     localStorage.removeItem(key)
//   },
//   subscribe(key, callback, initialValue) {
//     if (
//       typeof window === 'undefined' ||
//       typeof window.addEventListener === 'undefined'
//     ) {
//       return
//     }
//     window.addEventListener('storage', (e) => {
//       if (e.storageArea === localStorage && e.key === key) {
//         let newValue
//         try {
//           newValue = myNumberSchema.parse(JSON.parse(e.newValue ?? ''))
//         } catch {
//           newValue = initialValue
//         }
//         callback(newValue)
//       }
//     })
//   }
// }