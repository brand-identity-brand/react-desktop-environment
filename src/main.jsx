import React from 'react'
import ReactDOM from 'react-dom/client'

import './main.css'
import App from './App'
import { DesktopEnvironmentContextProvider } from './lib';

ReactDOM.createRoot(document.getElementById('root')).render(
  <DesktopEnvironmentContextProvider>
    <React.StrictMode>
      <App id={0}/>
    </React.StrictMode>
  </DesktopEnvironmentContextProvider>
)
