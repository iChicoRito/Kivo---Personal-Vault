import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { installContextMenuGuard } from './lib/contextMenu'
import './styles/globals.css'

const root = document.getElementById('root')

if (!root) {
  throw new Error('Kivo root element was not found')
}

installContextMenuGuard()

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
