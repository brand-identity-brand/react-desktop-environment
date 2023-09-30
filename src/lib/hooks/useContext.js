import { useContext } from 'react';
import { WindowManagerRegistryContext, WindowManagerContext } from 'react-window-manager';
import { DesktopEnvironmentContext } from '../contexts/DesktopEnvironment';

export function useWindowManagerRegistryContext(){
    return useContext(WindowManagerRegistryContext);

}

export function useWindowManagerContext(){
    return useContext(WindowManagerContext);
}

export function useDesktopEnvironmentContext(){
    return useContext(DesktopEnvironmentContext)
}