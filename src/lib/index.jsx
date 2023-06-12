import
    DesktopEnvironmentContextProvider,{ 
        WindowManagerContext,
        DesktopEnvironmentContext 
    } from './contexts/DesktopEnvironmentContextProvider';
import WindowFrame from './components/WindowFrame';
import Window from './components/Window';
import Desktop from './components/Desktop';
import SpawnWindowButton from '../SpawnWindowButton';

/**
 * { Bar, Menu, Icons, Windows, Footer } = Start;
 * { Windows.Minimised } = Windows;
 */

import * as Start from './components/Start';

import { atom, useAtom, onWindowClose } from './hooks/jotai';

const rde = {
    atom,
    useAtom,
    onWindowClose
}

export {
    DesktopEnvironmentContextProvider,
    WindowManagerContext,
    DesktopEnvironmentContext,
    WindowFrame,
    Window,
    Desktop,
    SpawnWindowButton,
    Start,
    rde
}