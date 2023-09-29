import * as StartFrame from "../frames/StartFrame";
import { useWindowManagerContext } from "../../hooks/useContext";

export default function Start({menu, icons, footer}){
    const { windows, unhideWindow } = useWindowManagerContext();
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
                    return (
                        <StartFrame.Windows.Minimised key={id}
                            onClick={()=>{unhideWindow(id)}}
                        >
                            {id}
                        </StartFrame.Windows.Minimised>
                    )
                })}
            </StartFrame.Windows>

            <StartFrame.Footer>

            </StartFrame.Footer>
        </StartFrame.Bar>
    )
}