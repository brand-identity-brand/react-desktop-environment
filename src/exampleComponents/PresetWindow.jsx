import { Window, Desktop } from '../lib';

export default function PresetWindow({children, ...props}){
    return (
        <Window {...props}>
            {/** Desktop props: className, style */}
            <Desktop> 
                {children}
            </Desktop>
        </Window>
    )
}