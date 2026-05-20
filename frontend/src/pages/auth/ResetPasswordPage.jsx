import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { FaLock, FaEye, FaEyeSlash, FaExclamationTriangle } from 'react-icons/fa'
import { useAuth } from '../../hooks/useAuth'
import { useFormValidation, validators } from '../../hooks/useFormValidation'
import FormField from '../../components/common/FormField'
import PasswordStrength from '../../components/common/PasswordStrength'
import LoadingSpinner from '../../components/common/LoadingSpinner'

const RULES = {
  new_password: [validators.password()],
  confirm_password: [
    validators.required('Please confirm your password.'),
    validators.match('new_password', 'Passwords do not match.'),
  ],
}

export default function ResetPasswordPage() {
  const [searchParams]  = useSearchParams()
  const token           = searchParams.get('token') || ''
  const { resetPassword } = useAuth()
  const [showPwd,     setShowPwd]     = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const { values, errors, touched, handleChange, handleBlur, validate } =
    useFormValidation({ new_password: '', confirm_password: '' }, RULES)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return
    resetPassword.mutate({ token, new_password: values.new_password })
  }

  if (!token) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
          <FaExclamationTriangle className="h-7 w-7 text-red-500" />
        </div>
        <h2 className="mb-2 text-xl font-bold text-gray-900">Invalid reset link</h2>
        <p className="mb-6 text-sm text-gray-500">
          This reset link is missing or invalid. Please request a new one.
        </p>
        <Link to="/forgot-password" className="btn-primary w-full">
          Request New Link
        </Link>
      </div>
    )
  }

  return (
    <div>
      <h2 className="mb-1 text-2xl font-bold text-gray-900">Set new password</h2>
      <p className="mb-6 text-sm text-gray-500">
        Choose a strong password for your account.
      </p>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div>
          <FormField
            label="New Password"
            id="new_password"
            type={showPwd ? 'text' : 'password'}
            name="new_password"
            autoComplete="new-password"
            placeholder="Min. 8 characters"
            icon={FaLock}
            value={values.new_password}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.new_password}
            touched={touched.new_password}
            rightElement={
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="text-gray-400 hover:text-gray-600 focus:outline-none"
                aria-label={showPwd ? 'Hide' : 'Show'}
              >
                {showPwd ? <FaEyeSlash className="h-4 w-4" /> : <FaEye className="h-4 w-4" />}
              </button>
            }
          />
          <PasswordStrength password={values.new_password} />
        </div>

        <FormField
          label="Confirm New Password"
          id="confirm_password"
          type={showConfirm ? 'text' : 'password'}
          name="confirm_password"
          autoComplete="new-password"
          placeholder="Repeat your password"
          icon={FaLock}
          value={values.confirm_password}
          onChange={handleChange}
          onBlur={handleBlur}
          error={errors.confirm_password}
          touched={touched.confirm_password}
          rightElement={
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="text-gray-400 hover:text-gray-600 focus:outline-none"
              aria-label={showConfirm ? 'Hide' : 'Show'}
            >
              {showConfirm ? <FaEyeSlash className="h-4 w-4" /> : <FaEye className="h-4 w-4" />}
            </button>
          }
        />

        <button
          type="submit"
          disabled={resetPassword.isPending}
          className="btn-primary w-full py-3"
        >
          {resetPassword.isPending ? (
            <><LoadingSpinner size="sm" color="white" /> Resetting…</>
          ) : (
            'Reset Password'
          )}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-500">
        Remembered it?{' '}
        <Link to="/login" className="font-medium text-primary-600 hover:text-primary-700">
          Sign in
        </Link>
      </p>
    </div>
  )
}
