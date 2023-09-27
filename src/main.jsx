import React,{useContext} from 'react'
import ReactDOM from 'react-dom/client'

import './main.css'
import App from './App'
import WindowManagerRegistryProvider, {WindowManagerProvider, WindowManagerRegistryContext} from 'react-window-manager';
import DesktopEnvironmentProvider, { Window } from './lib';
import Inception from './exampleComponents/Inception';

const components = {
  Inception
}

ReactDOM.createRoot(document.getElementById('root')).render(<Wrapper/>)

function Wrapper(){
  return (
    <React.StrictMode>
      <WindowManagerRegistryProvider>
        <DesktopEnvironmentProvider components={components}>
          <Main/>
        </DesktopEnvironmentProvider>
      </WindowManagerRegistryProvider>
    </React.StrictMode>
  )
}

function Main(){
  const { initWindow } = useContext(WindowManagerRegistryContext);
  initWindow('/index');
  return (
    <App/>
  )
}