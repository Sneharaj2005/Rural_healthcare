import { Link } from 'react-router-dom'
import { FaHeartbeat, FaPhone, FaEnvelope } from 'react-icons/fa'

const footerLinks = {
  App: [
    { label: 'Dashboard',      to: '/dashboard' },
    { label: 'AI Assistant',   to: '/ai-chat' },
    { label: 'Clinic Finder',  to: '/clinic-finder' },
    { label: 'Health Records', to: '/health-records' },
  ],
  Account: [
    { label: 'My Profile', to: '/profile' },
    { label: 'Login',      to: '/login' },
    { label: 'Register',   to: '/register' },
  ],
}

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">

          {/* Brand */}
          <div className="lg:col-span-2">
            <Link to="/" className="inline-flex items-center gap-2.5 text-primary-700">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600">
                <FaHeartbeat className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-gray-900 leading-none">RHC AI Lite</p>
                <p className="text-xs text-gray-500">Rural Health Companion</p>
              </div>
            </Link>
            <p className="mt-4 max-w-xs text-sm text-gray-500 leading-relaxed">
              Bridging the healthcare gap for rural communities with AI-powered guidance,
              clinic discovery, and personal health management.
            </p>
            <div className="mt-5 space-y-2 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <FaPhone className="h-3.5 w-3.5 text-primary-500" />
                <span>Emergency: 112 / 108</span>
              </div>
              <div className="flex items-center gap-2">
                <FaEnvelope className="h-3.5 w-3.5 text-primary-500" />
                <span>support@rhcailite.health</span>
              </div>
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-400">
                {title}
              </p>
              <ul className="space-y-2.5">
                {links.map(({ label, to }) => (
                  <li key={to}>
                    <Link
                      to={to}
                      className="text-sm text-gray-600 transition-colors hover:text-primary-600"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-gray-100 pt-6 sm:flex-row">
          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} RHC AI Lite. All rights reserved.
          </p>
          <p className="text-center text-xs text-gray-400 max-w-md">
            ⚠️ This app provides general health information only. Always consult a qualified
            healthcare professional for medical advice.
          </p>
        </div>
      </div>
    </footer>
  )
}
