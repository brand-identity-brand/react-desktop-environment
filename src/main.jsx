import React from 'react'
import ReactDOM from 'react-dom/client'

import './main.css'
import App from './App'
import WindowManagerRegistryProvider, {WindowManagerProvider} from 'react-window-manager';
import DesktopEnvironmentProvider, { Window } from './lib';
import Inception from './exampleComponents/Inception';

const value = {
  components: {
    Inception
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <WindowManagerRegistryProvider>
    <DesktopEnvironmentProvider value={value}>
      <React.StrictMode>
        <App/>
      </React.StrictMode>
    </DesktopEnvironmentProvider>
  </WindowManagerRegistryProvider>
)

