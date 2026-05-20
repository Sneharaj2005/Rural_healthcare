import { useState, useRef, useEffect } from 'react'
import { FaGlobe, FaChevronDown, FaCheck } from 'react-icons/fa'
import { useLanguage } from '../../hooks/useLanguage'
import clsx from 'clsx'

/**
 * LanguageSwitcher dropdown.
 * variant="navbar"  — compact icon+code for the top navbar
 * variant="profile" — full-width selector for the profile page
 */
export default function LanguageSwitcher({ variant = 'navbar' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const { currentLang, languages, changeLanguage } = useLanguage()

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = (code) => {
    changeLanguage(code)
    setOpen(false)
  }

  if (variant === 'profile') {
    return (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => handleSelect(lang.code)}
            className={clsx(
              'flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all',
              currentLang.code === lang.code
                ? 'border-primary-500 bg-primary-50 text-primary-700 ring-1 ring-primary-300'
                : 'border-gray-200 bg-white text-gray-700 hover:border-primary-300 hover:bg-primary-50'
            )}
          >
            <span className="text-base">{lang.flag}</span>
            <span className="flex-1 text-left">{lang.nativeLabel}</span>
            {currentLang.code === lang.code && (
              <FaCheck className="h-3 w-3 text-primary-600" />
            )}
          </button>
        ))}
      </div>
    )
  }

  // Navbar compact dropdown
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100"
        aria-label="Change language"
        aria-expanded={open}
      >
        <FaGlobe className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{currentLang.flag} {currentLang.code.toUpperCase()}</span>
        <FaChevronDown className={clsx('h-3 w-3 text-gray-400 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-44 rounded-2xl bg-white shadow-card-hover ring-1 ring-gray-100 animate-slide-up">
          <p className="border-b border-gray-100 px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
            Language
          </p>
          <ul className="p-1.5 space-y-0.5">
            {languages.map((lang) => (
              <li key={lang.code}>
                <button
                  onClick={() => handleSelect(lang.code)}
                  className={clsx(
                    'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                    currentLang.code === lang.code
                      ? 'bg-primary-50 font-semibold text-primary-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  )}
                >
                  <span>{lang.flag}</span>
                  <span className="flex-1 text-left">{lang.nativeLabel}</span>
                  {currentLang.code === lang.code && (
                    <FaCheck className="h-3 w-3 text-primary-500" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
