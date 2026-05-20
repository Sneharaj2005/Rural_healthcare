import { Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense, Component } from 'react'

// Layouts
import MainLayout      from './layouts/MainLayout'
import DashboardLayout from './layouts/DashboardLayout'
import AuthLayout      from './layouts/AuthLayout'
import LoadingSpinner  from './components/common/LoadingSpinner'

// Lazy pages
const HomePage = lazy(() => import('./pages/HomePage'))
const LoginPage = lazy(() => import('./pages/auth/LoginPage'))
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'))
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const AIChatPage = lazy(() => import('./pages/AIChatPage'))
const ClinicFinderPage = lazy(() => import('./pages/ClinicFinderPage'))
const HealthRecordsPage = lazy(() => import('./pages/HealthRecordsPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const VaccinationPage = lazy(() => import('./pages/VaccinationPage'))
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))
const MaternalCarePage = lazy(() => import('./pages/MaternalCarePage'))
const PregnancyGuidancePage = lazy(() => import('./pages/PregnancyGuidancePage'))

// Guards
import ProtectedRoute from './components/guards/ProtectedRoute'
import GuestRoute     from './components/guards/GuestRoute'

// ── Error boundary to catch page-level crashes ────────────────────────────────
class ErrorBoundary extends Component {
  state = { hasError: false, error: null }
  static getDerivedStateFromError(error) { return { hasError: true, error } }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen flex-col items-center justify-center gap-4 bg-gray-50 p-8 text-center">
          <p className="text-lg font-semibold text-gray-800">Something went wrong</p>
          <p className="text-sm text-gray-500">{this.state.error?.message}</p>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload() }}
            className="btn-primary px-6 py-2"
          >
            Reload page
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

export default function App() {
  return (
    <ErrorBoundary>
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-gray-50"><LoadingSpinner /></div>}>
      <Routes>
        {/* ── Public ── */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
        </Route>

        {/* ── Auth (guest-only, centered card) ── */}
        <Route element={<GuestRoute />}>
          <Route element={<AuthLayout />}>
            <Route path="/login"           element={<LoginPage />} />
            <Route path="/register"        element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password"  element={<ResetPasswordPage />} />
          </Route>
        </Route>

        {/* ── Protected (sidebar + topbar) ── */}
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard"      element={<DashboardPage />} />
            <Route path="/ai-chat"        element={<AIChatPage />} />
            <Route path="/clinic-finder"  element={<ClinicFinderPage />} />
            <Route path="/health-records" element={<HealthRecordsPage />} />
            <Route path="/vaccination"    element={<VaccinationPage />} />
            <Route path="/notifications"  element={<NotificationsPage />} />
            <Route path="/profile"        element={<ProfilePage />} />
            <Route path="/maternal"       element={<MaternalCarePage />} />
            <Route path="/guidance"       element={<PregnancyGuidancePage />} />
          </Route>
        </Route>

        {/* ── Fallback ── */}
        <Route path="/404" element={<NotFoundPage />} />
        <Route path="*"    element={<Navigate to="/404" replace />} />
      </Routes>
    </Suspense>
    </ErrorBoundary>
  )
}
