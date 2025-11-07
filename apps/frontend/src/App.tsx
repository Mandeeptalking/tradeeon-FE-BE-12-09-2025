import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from './store/auth'
import { useAuth } from './hooks/useAuth'
import AppShell from './components/Layout/AppShell'
import { queryClient } from './lib/queryClient'
import Home from './pages/Home'
import GetStarted from './pages/GetStarted'
import SignIn from './pages/SignIn'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
import Dashboard from './pages/Dashboard'
import ConnectionsTest from './pages/app/ConnectionsTest'
import Portfolio from './pages/app/Portfolio'
import BotsPage from './pages/BotsPage'
import Activity from './pages/Activity'
import Settings from './pages/Settings'
import CleanCharts from './pages/CleanCharts'
import DCABot from './pages/DCABot'
import ErrorBoundary from './components/ErrorBoundary'

function App() {
  const { isAuthenticated, user } = useAuthStore()
  const authInitialized = useAuth() // Initialize auth session management
  const location = useLocation()

  // Debug logging
  console.log('📱 App render:', { 
    isAuthenticated, 
    userId: user?.id, 
    authInitialized,
    path: location.pathname 
  });


  return (
    <QueryClientProvider client={queryClient}>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10B981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#EF4444',
              secondary: '#fff',
            },
          },
        }}
      />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/get-started" element={<GetStarted />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/clean-charts" element={<CleanCharts />} />
      
        {/* Protected routes */}
        <Route path="/app" element={
          !authInitialized ? (
            <div className="flex items-center justify-center min-h-screen bg-gray-900">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : isAuthenticated ? (
            <AppShell />
          ) : (
            <Navigate to="/signin" replace state={{ from: location.pathname }} />
          )
        }>
          <Route index element={<Dashboard />} />
                <Route path="connections" element={<ConnectionsTest />} />
          <Route path="portfolio" element={<Portfolio />} />
          <Route path="bots" element={<BotsPage />} />
          <Route path="dca-bot" element={<ErrorBoundary><DCABot /></ErrorBoundary>} />
          <Route path="activity" element={<Activity />} />
          <Route path="settings" element={<Settings />} />
          <Route path="clean-charts" element={<CleanCharts />} />
        </Route>
      
      {/* Redirect unknown routes to home (only if not /app/*) */}
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </QueryClientProvider>
  )
}

export default App