import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import WakeUp from './components/WakeUp.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <WakeUp>
      <App />
    </WakeUp>
  </StrictMode>
)
