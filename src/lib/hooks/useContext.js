import { useContext } from 'react';
import { WindowManagerRegistryContext, WindowManagerContext } from 'react-window-manager';

export function useWindowManagerRegistryContext(){
    return useContext(WindowManagerRegistryContext);

}

export function useWindowManagerContext(){
    return useContext(WindowManagerContext);
}