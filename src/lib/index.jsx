import Desktop from './components/Desktop';
import Window from "./components/Window";
import WindowFrame from "./components/WindowFrame";
import * as Start from "./components/Start";
import DesktopEnvironmentProvider, { DesktopEnvironmentContext } from "./contexts/DesktopEnvironment";

export default DesktopEnvironmentProvider;
export {
    Desktop,
    Window,
    WindowFrame,
    Start,
    DesktopEnvironmentContext
}