import { Desktop, WindowWithJotaiStorageAtom as Window } from "..";

export default function WindowWithJotaiStorageAtomAndDesktop({id, initialZIndex, ...props}){
    // userinput from createWindow
    const { initialTitle, initialPosition, initialSize, minSize, minimiseWindow: _minimiseWindow, children, closeWindow, moveWindow, resizeWindow } = props;

    const { 
        windows, 
        getWindowsByParentId, 
        windowsTree, 
        useMinimise, windowToTop, createWindow, windowsRef, getMinimisedWindowsInDesktop} = useContext( WindowManagerContext );
    const { minimisedWindowIds, minimiseWindow, restoreMinimisedWindow } = useMinimise()//initialUseMinimise;

    function RenderMinimised(){
        return (
            <>
                { getMinimisedWindowsInDesktop(id, minimisedWindowIds).map(minimisedWindowId=>{
                    const { props } = windowsRef.current[minimisedWindowId];
                    // TODO: restore useMinimise by injecting new useMinimise
                    return (
                        <Start.Windows.Minimised key={minimisedWindowId}
                            onClick={()=>{
                                windowToTop(minimisedWindowId);
                                restoreMinimisedWindow(minimisedWindowId);
                            }}
                        >
                            {`${props.initialTitle}`}
                        </Start.Windows.Minimised>
                    )
                })}
            </>
        )
    }
    return (
        <Window {...{id,initialZIndex}} // autofilled from createWindow 
            // userinput from createWindow
            initialPosition={initialPosition}
            initialSize={initialSize}
            /* 'local', 'disable', minimiseFunction */
            minimiseWindow = { _minimiseWindow }
            // local values.
            title={initialTitle}
            minSize={minSize}
        >
            <Desktop {...{id,minimisedWindowIds}}
                style={{
                    zIndex: '1',
                    height: 'calc( 100% - 32px - 20px - 2px )',
                }}
            >
                {children}
            </Desktop>
            {/* <Start.Bar>
                <Start.Menu logo={ <Icon/> }>
                    <div>settings</div>
                </Start.Menu>
                <Start.Icons className={css.StartIcons}>
                    <div>{'['}</div>
                    <div>{']'}</div>
                </Start.Icons>
                <Start.Windows>
                    <RenderMinimised/>
                </Start.Windows>
                <Start.Footer>
                    
                </Start.Footer>
            </Start.Bar> */}
        </Window>
    )
}