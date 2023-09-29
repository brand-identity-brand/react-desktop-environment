import DesktopEnvironmentProvider from "./DesktopEnvironment";
import WindowManagerRegistryProvider from "react-window-manager";

export default function DesktopEnvironmentWithWindowManagerRegistryProvider ({components,children}){
    return (
        <WindowManagerRegistryProvider>
            <DesktopEnvironmentProvider components={components}>
                {children}
            </DesktopEnvironmentProvider>
        </WindowManagerRegistryProvider>
    )
}