import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

export default function GuestRoute() {
  const { isAuthenticated, isTokenExpired } = useAuthStore()

  if (isAuthenticated && !isTokenExpired()) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
