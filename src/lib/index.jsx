import
    DesktopEnvironmentContextProvider,{ 
        WindowManagerContext,
        DesktopEnvironmentContext 
    } from './DesktopEnvironmentContextProvider';
import WindowFrame from './WindowFrame';
import Window from './Window';
import Desktop from './Desktop';
import SpawnWindowButton from './SpawnWindowButton';

/**
 * { Bar, Menu, Icons, Windows, Footer } = Start;
 * { Windows.Minimised } = Windows;
 */

import * as Start from './Start';

export {
    DesktopEnvironmentContextProvider,
    WindowManagerContext,
    DesktopEnvironmentContext,
    WindowFrame,
    Window,
    Desktop,
    SpawnWindowButton,
    Start 
}