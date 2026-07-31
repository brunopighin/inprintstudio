import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import './index.css'

if ('scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual'
}

const preloaderStart = performance.now()
const MIN_PRELOADER_MS = 2500

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <App />
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
)

window.scrollTo({ top: 0, left: 0, behavior: 'instant' })

const elapsed = performance.now() - preloaderStart
setTimeout(() => {
  document.getElementById('preloader')?.remove()
}, Math.max(0, MIN_PRELOADER_MS - elapsed))
