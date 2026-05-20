import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

export default function ProtectedRoute() {
  const { isAuthenticated, isTokenExpired, logout } = useAuthStore()
  const location = useLocation()

  // If token is expired, clear auth state and redirect to login
  if (isAuthenticated && isTokenExpired()) {
    logout()
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Outlet />
}
