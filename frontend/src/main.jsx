import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './store/AuthContext'
import { Toaster } from 'react-hot-toast'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#0a0a0a',
            color: '#e5e7eb',
            border: '1px solid #262626',
            borderRadius: '4px',
            fontSize: '13px',
            fontFamily: 'monospace',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)'
          },
          success: {
            style: { borderLeft: '4px solid #10b981' },
            iconTheme: { primary: '#10b981', secondary: '#0a0a0a' },
          },
          error: {
            style: { borderLeft: '4px solid #ef4444' },
            iconTheme: { primary: '#ef4444', secondary: '#0a0a0a' },
            duration: 5000,
          },
        }}
      />
    </AuthProvider>
  </StrictMode>,
)
