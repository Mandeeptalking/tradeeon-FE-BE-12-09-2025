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
import ConnectionsClean from './pages/app/ConnectionsClean'
import ConnectionsTest from './pages/app/ConnectionsTest'
import Portfolio from './pages/app/Portfolio'
import BotsPage from './pages/BotsPage'
import Activity from './pages/Activity'
import Settings from './pages/Settings'
import CleanCharts from './pages/CleanCharts'
import TestPage from './pages/TestPage'
import WorkingChart from './pages/WorkingChart'
import SimpleTest from './pages/SimpleTest'
import ValidationDemo from './pages/ValidationDemo'
import ProperIndicatorDemo from './pages/ProperIndicatorDemo'
import SimpleIndicatorTest from './pages/SimpleIndicatorTest'
import WorkingIndicatorPane from './pages/WorkingIndicatorPane'
import SimpleIndicatorPane from './pages/SimpleIndicatorPane'
import MinimalTest from './pages/MinimalTest'
import WorkingSimpleChart from './pages/WorkingSimpleChart'
import BasicChartTest from './pages/BasicChartTest'
import StrategyBuilder from './pages/StrategyBuilder'
import StrategyLibrary from './pages/StrategyLibrary'
import StrategyManager from './pages/StrategyManager'
import StrategyManager1 from './pages/StrategyManager1'
import VisualStrategyBuilder from './pages/VisualStrategyBuilder'
import DCABot from './pages/DCABot'
import ErrorBoundary from './components/ErrorBoundary'

function App() {
  const { isAuthenticated, user } = useAuthStore()
  const authInitialized = useAuth() // Initialize auth session management
  const location = useLocation()

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
        <Route path="/test" element={<TestPage />} />
        <Route path="/working-chart" element={<WorkingChart />} />
        <Route path="/simple-test" element={<SimpleTest />} />
        <Route path="/validation-demo" element={<ValidationDemo />} />
        <Route path="/proper-indicators" element={<ProperIndicatorDemo />} />
        <Route path="/indicator-test" element={<SimpleIndicatorTest />} />
        <Route path="/working-indicator-pane" element={<WorkingIndicatorPane />} />
        <Route path="/simple-indicator-pane" element={<SimpleIndicatorPane />} />
        <Route path="/minimal-test" element={<MinimalTest />} />
        <Route path="/working-simple-chart" element={<WorkingSimpleChart />} />
        <Route path="/basic-chart-test" element={<BasicChartTest />} />
        <Route path="/strategy-builder" element={<StrategyBuilder />} />
        <Route path="/strategy-library" element={<StrategyLibrary />} />
        <Route path="/strategy-manager" element={<StrategyManager />} />
        <Route path="/strategy-manager-1" element={<StrategyManager1 />} />
        <Route path="/visual-strategy-builder" element={<VisualStrategyBuilder />} />
      
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