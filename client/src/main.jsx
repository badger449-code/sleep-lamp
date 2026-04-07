import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import App from './App.jsx'
import Demo from './Demo.jsx'

const isDemo = window.location.pathname === '/demo';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isDemo ? <Demo /> : <App />}
  </StrictMode>,
)
