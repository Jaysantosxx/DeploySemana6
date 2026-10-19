import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { AppProvider } from './AppContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider>
      <BrowserRouter
        basename={import.meta.env.BASE_URL === '/'
          ? undefined
          : import.meta.env.BASE_URL.replace(/\/$/, '')}
      >
        <App />
      </BrowserRouter>
    </AppProvider>
  </StrictMode>,
)
