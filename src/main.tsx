import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { handleExpiredToken } from './utils/auth'

const originalFetch = window.fetch.bind(window)

window.fetch = async (...args) => {
  const response = await originalFetch(...args)

  if (!response.ok) {
    const payload = await response.clone().json().catch(() => null)
    handleExpiredToken(payload)
  }

  return response
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
