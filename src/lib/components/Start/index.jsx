import * as StartFrame from "../frames/StartFrame";
import { useWindowManagerContext, useWindowManagerRegistryContext } from "../../hooks/useContext";

export default function Start({menu, icons, footer}){
    const { windows, unhideWindow, getWindowState } = useWindowManagerContext();
    const { getTargetWindowSpecsById } = useWindowManagerRegistryContext();
    return (
        < StartFrame.Bar>

            < StartFrame.Menu>
                <div>settings</div>
            </ StartFrame.Menu>
            
            < StartFrame.Icons>
                <div>{'||'}</div>
                <div>{'||'}</div>
            </ StartFrame.Icons>

            <StartFrame.Windows>
                {windows.hidden.map( id => {
                    const { states: {title} }= getTargetWindowSpecsById(id);
                    return (
                        <StartFrame.Windows.Minimised key={id}
                            onClick={()=>{unhideWindow(id)}}
                        >
                            {title}
                        </StartFrame.Windows.Minimised>
                    )
                })}
            </StartFrame.Windows>

            <StartFrame.Footer>

            </StartFrame.Footer>
        </StartFrame.Bar>
    )
}