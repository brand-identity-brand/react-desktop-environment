import React from 'react'
import ReactDOM from 'react-dom'
import './index.css'
import App from './App'
import { DesktopEnvironmentContextProvider } from './lib';


ReactDOM.render(

   <DesktopEnvironmentContextProvider>
    <React.StrictMode>
        <App id={0}/>
    </React.StrictMode>
   </DesktopEnvironmentContextProvider>,
   
  document.getElementById('root')
);

