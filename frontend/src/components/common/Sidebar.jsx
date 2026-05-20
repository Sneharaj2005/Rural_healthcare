import { NavLink, Link, useNavigate } from 'react-router-dom'
import {
  FaTachometerAlt, FaRobot, FaMapMarkerAlt,
  FaSyringe, FaBaby, FaBookMedical, FaUserCircle,
  FaSignOutAlt, FaTimes, FaChevronLeft, FaHeartbeat
} from 'react-icons/fa'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../store/authStore'
import clsx from 'clsx'

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const navLinks = [
    { to: '/dashboard',     icon: FaTachometerAlt, label: t('nav.dashboard') },
    { to: '/ai-chat',       icon: FaRobot,         label: t('nav.aiChat') },
    { to: '/clinic-finder', icon: FaMapMarkerAlt,  label: t('nav.clinicFinder') },
    { to: '/vaccination',   icon: FaSyringe,       label: t('nav.vaccination') },
    { to: '/maternal',      icon: FaBaby,          label: t('nav.maternal') },
    { to: '/guidance',      icon: FaBookMedical,   label: t('nav.guidance') },
    { to: '/profile',       icon: FaUserCircle,    label: t('nav.profile') },
  ]

  const handleLogout = () => {
    logout()
    navigate('/')
    onMobileClose?.()
  }

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-40 flex flex-col bg-sidebar-bg transition-all duration-250',
          collapsed ? 'lg:w-[72px]' : 'lg:w-64',
          mobileOpen ? 'flex w-72 shadow-sidebar animate-slide-in' : 'hidden lg:flex',
        )}
        aria-label="Sidebar navigation"
      >
        {/* ── Header ── */}
        <div className={clsx(
          'flex h-16 flex-shrink-0 items-center border-b border-sidebar-border px-4',
          collapsed ? 'justify-center' : 'justify-between'
        )}>
          {!collapsed && (
            <Link to="/" className="flex items-center gap-2.5 text-white">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600">
                <FaHeartbeat className="h-4 w-4" />
              </div>
              <div className="leading-none">
                <p className="text-sm font-bold">RHC AI Lite</p>
                <p className="text-2xs text-sidebar-text">Rural Health</p>
              </div>
            </Link>
          )}
          {collapsed && (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600">
              <FaHeartbeat className="h-4 w-4 text-white" />
            </div>
          )}

          {/* Desktop collapse toggle */}
          {!collapsed && (
            <button
              onClick={onToggle}
              className="hidden lg:flex btn-icon text-sidebar-text hover:bg-sidebar-hover hover:text-white"
              aria-label="Collapse sidebar"
            >
              <FaChevronLeft className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Mobile close */}
          <button
            onClick={onMobileClose}
            className="lg:hidden btn-icon text-sidebar-text hover:bg-sidebar-hover hover:text-white"
            aria-label="Close menu"
          >
            <FaTimes className="h-4 w-4" />
          </button>
        </div>

        {/* ── Nav links ── */}
        <nav className="sidebar-scroll flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {!collapsed && (
            <p className="mb-2 px-3 text-2xs font-semibold uppercase tracking-widest text-sidebar-text/50">
              {t('nav.navigation')}
            </p>
          )}

          {navLinks.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onMobileClose}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                clsx(
                  'flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  collapsed ? 'justify-center' : 'gap-3',
                  isActive
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'text-sidebar-text hover:bg-sidebar-hover hover:text-white'
                )
              }
            >
              <Icon className={clsx('flex-shrink-0', collapsed ? 'h-5 w-5' : 'h-4 w-4')} />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* ── User footer ── */}
        <div className="flex-shrink-0 border-t border-sidebar-border p-3">
          {!collapsed ? (
            <div className="flex items-center gap-3 rounded-xl px-2 py-2">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-600 text-xs font-bold text-white">
                {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-white">
                  {user?.full_name || 'User'}
                </p>
                <p className="truncate text-2xs text-sidebar-text">{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex-shrink-0 rounded-lg p-1.5 text-sidebar-text transition-colors hover:bg-sidebar-hover hover:text-red-400"
                title="Logout"
                aria-label="Logout"
              >
                <FaSignOutAlt className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogout}
              className="flex w-full items-center justify-center rounded-xl p-2.5 text-sidebar-text transition-colors hover:bg-sidebar-hover hover:text-red-400"
              title="Logout"
              aria-label="Logout"
            >
              <FaSignOutAlt className="h-4 w-4" />
            </button>
          )}
        </div>
      </aside>
    </>
  )
}
