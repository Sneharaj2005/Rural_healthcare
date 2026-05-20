import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'
import 'leaflet/dist/leaflet.css'  // global import prevents mobile chunk crash
import './i18n/index.js'   // initialise i18next before render

// ── Clear stale expired auth state on startup ─────────────────────────────────
// Prevents a loop where an expired token causes 401s on every request
try {
  const stored = JSON.parse(localStorage.getItem('rhc-auth') || '{}')
  const state  = stored?.state
  if (state?.tokenExpiresAt && new Date(state.tokenExpiresAt) < new Date()) {
    localStorage.removeItem('rhc-auth')
  }
} catch {
  localStorage.removeItem('rhc-auth')
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />

        {/* ── Toast notifications ── */}
        <Toaster
          position="top-right"
          gutter={10}
          toastOptions={{
            duration: 4000,
            style: {
              background: '#ffffff',
              color: '#111827',
              borderRadius: '0.75rem',
              boxShadow: '0 8px 24px -4px rgb(0 0 0 / 0.18)',
              fontSize: '0.875rem',
              fontWeight: '500',
              padding: '12px 16px',
              maxWidth: '380px',
            },
            success: {
              iconTheme: { primary: '#16a34a', secondary: '#f0fdf4' },
              style: {
                borderLeft: '4px solid #16a34a',
              },
            },
            error: {
              iconTheme: { primary: '#dc2626', secondary: '#fef2f2' },
              style: {
                borderLeft: '4px solid #dc2626',
              },
            },
            loading: {
              iconTheme: { primary: '#2563eb', secondary: '#eff6ff' },
            },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)
