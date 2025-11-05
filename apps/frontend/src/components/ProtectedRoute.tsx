import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import AppShell from './Layout/AppShell'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated } = useAuthStore()
  const location = useLocation()

  // Wait for auth to initialize (check if we have a session check in progress)
  // For now, check immediately - the useAuth hook will update the store
  if (!isAuthenticated) {
    // Redirect to signin but preserve the intended destination
    return <Navigate to="/signin" replace state={{ from: location.pathname }} />
  }

  return <AppShell>{children}</AppShell>
}

