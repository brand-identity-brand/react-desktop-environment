import * as StartFrame from "../frames/StartFrame";
import { useWindowManagerContext, useWindowManagerRegistryContext } from "../../hooks/useContext";

export default function Start(){
    const { windows, unhideWindow } = useWindowManagerContext();
    const { getTargetWindowSpecsById } = useWindowManagerRegistryContext();
    return (
        < StartFrame.Bar>

            {/* < StartFrame.Menu>
                <div>settings</div>
            </ StartFrame.Menu>
            
            < StartFrame.Icons>
                <div>{'||'}</div>

                <div>{'||'}</div>
            </ StartFrame.Icons> */}

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

            {/* <StartFrame.Footer>

            </StartFrame.Footer> */}
        </StartFrame.Bar>
    )
}
Start.Bar = ({className = '', style = {}, children}) => < StartFrame.Bar className={className} style={style}>{children}</StartFrame.Bar>
Start.Menu = ({className = '', style = {}, children}) => < StartFrame.Menu className={className} style={style}>{children}</StartFrame.Menu>
Start.Icons = ({className = '', style = {}, children}) => < StartFrame.Icons className={className} style={style}>{children}</StartFrame.Icons>
Start.Windows = ({classNames = {}, styles = {}}) => {
    const { getTargetWindowSpecsById } = useWindowManagerRegistryContext();
    const { windows, unhideWindow } = useWindowManagerContext();
    return(
        <StartFrame.Windows classNames={classNames.container} style={styles.container}>
            {windows.hidden.map( id => {
                const { states: {title} }= getTargetWindowSpecsById(id);
                return (
                    <StartFrame.Windows.Minimised key={id} classNames={classNames.minimised} style={styles.minimised}
                        onClick={()=>{unhideWindow(id)}}
                    >
                        {title}
                    </StartFrame.Windows.Minimised>
                )
            })}
        </StartFrame.Windows>
    )
}
Start.Footer = ({className = '', style = {}, children}) => < StartFrame.Footer className={className} style={style}>{children}</StartFrame.Footer>