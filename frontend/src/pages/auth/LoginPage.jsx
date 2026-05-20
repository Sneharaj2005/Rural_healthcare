import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { FaEnvelope, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth'
import { useFormValidation, validators } from '../../hooks/useFormValidation'
import FormField from '../../components/common/FormField'
import LoadingSpinner from '../../components/common/LoadingSpinner'

export default function LoginPage() {
  const location = useLocation()
  const { login } = useAuth()
  const { t } = useTranslation()
  const [showPassword, setShowPassword] = useState(false)

  const RULES = {
    email:    [validators.required(), validators.email()],
    password: [validators.required(t('auth.password') + ' is required.')],
  }

  const { values, errors, touched, handleChange, handleBlur, validate } =
    useFormValidation({ email: '', password: '' }, RULES)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return
    login.mutate({ ...values, _redirectTo: location.state?.from?.pathname || '/dashboard' })
  }

  return (
    <div>
      <h2 className="mb-1 text-2xl font-bold text-gray-900">{t('auth.welcomeBack')}</h2>
      <p className="mb-6 text-sm text-gray-500">{t('auth.signInSubtitle')}</p>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <FormField
          label={t('auth.email')} id="email" type="email" name="email"
          autoComplete="email" placeholder="you@example.com" icon={FaEnvelope}
          value={values.email} onChange={handleChange} onBlur={handleBlur}
          error={errors.email} touched={touched.email}
        />
        <FormField
          label={t('auth.password')} id="password"
          type={showPassword ? 'text' : 'password'} name="password"
          autoComplete="current-password" placeholder="••••••••" icon={FaLock}
          value={values.password} onChange={handleChange} onBlur={handleBlur}
          error={errors.password} touched={touched.password}
          rightElement={
            <button type="button" onClick={() => setShowPassword(v => !v)}
              className="text-gray-400 hover:text-gray-600 focus:outline-none"
              aria-label={showPassword ? 'Hide' : 'Show'}>
              {showPassword ? <FaEyeSlash className="h-4 w-4" /> : <FaEye className="h-4 w-4" />}
            </button>
          }
        />
        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-xs font-medium text-primary-600 hover:text-primary-700">
            {t('auth.forgotPassword')}
          </Link>
        </div>
        <button type="submit" disabled={login.isPending} className="btn-primary w-full py-3 mt-2">
          {login.isPending
            ? <><LoadingSpinner size="sm" color="white" /> {t('auth.signingIn')}</>
            : t('auth.signIn')}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        {t('auth.noAccount')}{' '}
        <Link to="/register" className="font-medium text-primary-600 hover:text-primary-700">
          {t('auth.createOne')}
        </Link>
      </p>
    </div>
  )
}
