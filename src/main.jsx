import React from 'react'
import ReactDOM from 'react-dom'
import './index.css'
import App from './App'

import WindowManagerContextProvider from 'react-window-manager';

ReactDOM.render(
  <WindowManagerContextProvider>
    <React.StrictMode>
      <App />
    </React.StrictMode>
  </WindowManagerContextProvider>,
  document.getElementById('root')
);

