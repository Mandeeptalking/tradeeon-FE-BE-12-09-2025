import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary'
import { logger } from './utils/logger'
import './index.css'

// Debug: Check if environment variables are loaded
// Debug logging removed for security - use logger utility if needed
// logger.debug('🔍 Vite Environment Check:', {
//   VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
//   VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'SET' : 'MISSING',
//   MODE: import.meta.env.MODE,
//   DEV: import.meta.env.DEV,
//   PROD: import.meta.env.PROD
// });

// Add error handler for unhandled errors
window.addEventListener('error', (event) => {
  try {
    logger.error('Global error:', event.error);
  } catch (e) {
    // Fallback to console if logger fails
    try {
      console.error('Global error:', event.error);
    } catch (consoleError) {
      // Silently fail if console is not available
    }
  }
});

window.addEventListener('unhandledrejection', (event) => {
  try {
    logger.error('Unhandled promise rejection:', event.reason);
  } catch (e) {
    // Fallback to console if logger fails
    try {
      console.error('Unhandled promise rejection:', event.reason);
    } catch (consoleError) {
      // Silently fail if console is not available
    }
  }
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ErrorBoundary
      fallback={
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          minHeight: '100vh',
          backgroundColor: '#111827',
          color: 'white',
          flexDirection: 'column',
          padding: '20px'
        }}>
          <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>Application Error</h1>
          <p style={{ marginBottom: '16px' }}>Something went wrong. Please check the console for details.</p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px',
              backgroundColor: '#3B82F6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Reload Page
          </button>
        </div>
      }
    >
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
)

