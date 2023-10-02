// Contextless 
import WindowFrame from "./components/frames/WindowFrame";
import DraggbleResizableFrame from "./components/frames/DraggbleResizableFrame";
import * as StartFrame from "./components/frames/StartFrame";
// with WindowManagerContext
import Desktop from './components/Desktop';
import Start from "./components/Start";
import Window from './components/Window';
// 
import DesktopEnvironmentProvider, { DesktopEnvironmentContext } from "./contexts/DesktopEnvironment";
import DesktopEnvironmentWithWindowManagerRegistryProvider from "./contexts/DesktopEnvironmentWithWindowManagerRegistryProvider";
// useContexts
import { useWindowManagerRegistryContext, useWindowManagerContext, useDesktopEnvironmentContext } from "./hooks/useContext";
// window-manager
import WindowManagerRegistryProvider, { WindowManagerProvider } from 'react-window-manager';

export default DesktopEnvironmentWithWindowManagerRegistryProvider;//DesktopEnvironmentProvider;

export {
    // Contextless 
    WindowFrame,
    DraggbleResizableFrame,
    StartFrame,
    // with WindowManagerContext
    Window,
    Desktop,
    Start,
    //
    WindowManagerRegistryProvider,
    DesktopEnvironmentProvider,
    WindowManagerProvider,
    // useContexts
    DesktopEnvironmentContext,
    useWindowManagerRegistryContext, 
    useWindowManagerContext,
    useDesktopEnvironmentContext
}