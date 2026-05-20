import { useState, useRef, useEffect } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import {
  FaHeartbeat, FaBars, FaTimes, FaUserCircle,
  FaBell, FaChevronDown, FaSignOutAlt, FaCog,
} from 'react-icons/fa'
import { useAuthStore } from '../../store/authStore'
import LanguageSwitcher from './LanguageSwitcher'
import clsx from 'clsx'

// ── Public nav links (unauthenticated) ──────────────────────────────────────
const publicLinks = [
  { to: '/', label: 'Home' },
]

// ── Notifications mock ───────────────────────────────────────────────────────
const NOTIFICATIONS = [
  { id: 1, text: 'Your health record was saved.', time: '2m ago', read: false },
  { id: 2, text: 'Daily health tip is ready.', time: '1h ago', read: false },
  { id: 3, text: 'AI assistant is available.', time: '3h ago', read: true },
]

function NotificationDropdown() {
  const unread = NOTIFICATIONS.filter((n) => !n.read).length

  return (
    <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl bg-white shadow-card-hover ring-1 ring-gray-100 animate-slide-up z-50">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <p className="text-sm font-semibold text-gray-900">Notifications</p>
        {unread > 0 && (
          <span className="badge-blue">{unread} new</span>
        )}
      </div>
      <ul className="max-h-72 overflow-y-auto divide-y divide-gray-50">
        {NOTIFICATIONS.map((n) => (
          <li
            key={n.id}
            className={clsx(
              'flex items-start gap-3 px-4 py-3 text-sm transition-colors hover:bg-gray-50',
              !n.read && 'bg-primary-50/40'
            )}
          >
            <span className={clsx(
              'mt-1.5 h-2 w-2 flex-shrink-0 rounded-full',
              n.read ? 'bg-gray-300' : 'bg-primary-500'
            )} />
            <div className="flex-1 min-w-0">
              <p className="text-gray-800 leading-snug">{n.text}</p>
              <p className="mt-0.5 text-xs text-gray-400">{n.time}</p>
            </div>
          </li>
        ))}
      </ul>
      <div className="border-t border-gray-100 px-4 py-2.5">
        <button className="text-xs font-medium text-primary-600 hover:text-primary-700">
          Mark all as read
        </button>
      </div>
    </div>
  )
}

function UserDropdown({ user, onLogout, onClose }) {
  return (
    <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-white shadow-card-hover ring-1 ring-gray-100 animate-slide-up z-50">
      <div className="border-b border-gray-100 px-4 py-3">
        <p className="text-sm font-semibold text-gray-900 truncate">{user?.full_name}</p>
        <p className="text-xs text-gray-500 truncate">{user?.email}</p>
      </div>
      <ul className="p-1.5">
        <li>
          <Link
            to="/profile"
            onClick={onClose}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
          >
            <FaUserCircle className="h-4 w-4 text-gray-400" />
            My Profile
          </Link>
        </li>
        <li>
          <Link
            to="/profile"
            onClick={onClose}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
          >
            <FaCog className="h-4 w-4 text-gray-400" />
            Settings
          </Link>
        </li>
      </ul>
      <div className="border-t border-gray-100 p-1.5">
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50"
        >
          <FaSignOutAlt className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  )
}

// ── Main Navbar ──────────────────────────────────────────────────────────────
export default function Navbar({ onSidebarToggle }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const { isAuthenticated, user, logout } = useAuthStore()
  const navigate = useNavigate()
  const notifRef = useRef(null)
  const userRef = useRef(null)

  const unreadCount = NOTIFICATIONS.filter((n) => !n.read).length

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false)
      if (userRef.current && !userRef.current.contains(e.target)) setUserOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/')
    setUserOpen(false)
  }

  return (
    <header className="sticky top-0 z-20 flex h-16 flex-shrink-0 items-center border-b border-gray-200 bg-white/95 backdrop-blur-sm px-4 sm:px-6">

      {/* Left: sidebar toggle (authenticated) or brand (public) */}
      <div className="flex items-center gap-3">
        {isAuthenticated ? (
          <>
            {/* Desktop sidebar collapse toggle */}
            <button
              onClick={onSidebarToggle}
              className="btn-icon hidden lg:flex"
              aria-label="Toggle sidebar"
            >
              <FaBars className="h-4 w-4" />
            </button>
            {/* Mobile sidebar open */}
            <button
              onClick={onSidebarToggle}
              className="btn-icon lg:hidden"
              aria-label="Open menu"
            >
              <FaBars className="h-4 w-4" />
            </button>
          </>
        ) : (
          <Link to="/" className="flex items-center gap-2 text-primary-700">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600">
              <FaHeartbeat className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-base leading-none hidden sm:block">RHC AI Lite</span>
          </Link>
        )}
      </div>

      {/* Center: public nav links */}
      {!isAuthenticated && (
        <nav className="hidden md:flex items-center gap-1 ml-6">
          {publicLinks.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                clsx(
                  'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-100'
                )
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right: actions */}
      <div className="flex items-center gap-2">
        {/* Language switcher — always visible */}
        <LanguageSwitcher variant="navbar" />

        {isAuthenticated ? (
          <>
            {/* Notifications */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => { setNotifOpen(!notifOpen); setUserOpen(false) }}
                className="btn-icon relative"
                aria-label="Notifications"
              >
                <FaBell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-2xs font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </button>
              {notifOpen && (
                <NotificationDropdown onClose={() => setNotifOpen(false)} />
              )}
            </div>

            {/* User menu */}
            <div className="relative" ref={userRef}>
              <button
                onClick={() => { setUserOpen(!userOpen); setNotifOpen(false) }}
                className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
                aria-label="User menu"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-600 text-xs font-bold text-white">
                  {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <span className="hidden sm:block max-w-[100px] truncate">
                  {user?.full_name?.split(' ')[0]}
                </span>
                <FaChevronDown className={clsx('h-3 w-3 text-gray-400 transition-transform', userOpen && 'rotate-180')} />
              </button>
              {userOpen && (
                <UserDropdown
                  user={user}
                  onLogout={handleLogout}
                  onClose={() => setUserOpen(false)}
                />
              )}
            </div>
          </>
        ) : (
          <>
            <Link to="/login" className="btn-secondary text-sm px-3 py-2">
              Login
            </Link>
            <Link to="/register" className="btn-primary text-sm px-3 py-2">
              Sign Up
            </Link>
            {/* Mobile hamburger for public pages */}
            <button
              className="md:hidden btn-icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <FaTimes className="h-4 w-4" /> : <FaBars className="h-4 w-4" />}
            </button>
          </>
        )}
      </div>

      {/* Mobile public menu */}
      {!isAuthenticated && mobileMenuOpen && (
        <div className="absolute inset-x-0 top-16 border-b border-gray-200 bg-white px-4 pb-4 pt-2 md:hidden animate-slide-up">
          {publicLinks.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {label}
            </NavLink>
          ))}
          <div className="mt-3 flex gap-2">
            <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="btn-secondary flex-1 text-sm">Login</Link>
            <Link to="/register" onClick={() => setMobileMenuOpen(false)} className="btn-primary flex-1 text-sm">Sign Up</Link>
          </div>
        </div>
      )}
    </header>
  )
}
