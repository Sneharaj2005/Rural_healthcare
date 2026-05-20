import { Outlet, Link } from 'react-router-dom'
import { FaHeartbeat } from 'react-icons/fa'

export default function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 via-white to-health-teal/10 px-4 py-12">
      <div className="w-full max-w-md animate-fade-in">
        {/* Brand */}
        <div className="mb-8 text-center">
          <Link to="/" className="inline-flex items-center gap-2.5 text-primary-700">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600">
              <FaHeartbeat className="h-5 w-5 text-white" />
            </div>
            <div className="text-left">
              <p className="text-lg font-bold leading-none text-gray-900">RHC AI Lite</p>
              <p className="text-xs text-gray-500">Rural Health Companion</p>
            </div>
          </Link>
        </div>

        {/* Card */}
        <div className="card shadow-card-hover">
          <Outlet />
        </div>

        {/* Footer note */}
        <p className="mt-6 text-center text-xs text-gray-400">
          By using this service you agree to our{' '}
          <span className="underline cursor-pointer hover:text-gray-600">Terms</span> and{' '}
          <span className="underline cursor-pointer hover:text-gray-600">Privacy Policy</span>.
        </p>
      </div>
    </div>
  )
}
