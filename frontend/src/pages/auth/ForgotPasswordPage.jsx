import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FaEnvelope, FaArrowLeft, FaCheckCircle } from 'react-icons/fa'
import { useAuth } from '../../hooks/useAuth'
import { useFormValidation, validators } from '../../hooks/useFormValidation'
import FormField from '../../components/common/FormField'
import LoadingSpinner from '../../components/common/LoadingSpinner'

const RULES = { email: [validators.required(), validators.email()] }

export default function ForgotPasswordPage() {
  const { forgotPassword } = useAuth()
  const [devToken, setDevToken] = useState(null)
  const [submitted, setSubmitted] = useState(false)

  const { values, errors, touched, handleChange, handleBlur, validate } =
    useFormValidation({ email: '' }, RULES)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    const result = await forgotPassword.mutateAsync(values.email).catch(() => null)
    setSubmitted(true)
    // In dev mode the backend returns the token directly
    if (result?.dev_reset_token) setDevToken(result.dev_reset_token)
  }

  if (submitted) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary-100">
          <FaCheckCircle className="h-7 w-7 text-primary-600" />
        </div>
        <h2 className="mb-2 text-xl font-bold text-gray-900">Check your email</h2>
        <p className="mb-6 text-sm text-gray-500">
          {"If "}<strong>{values.email}</strong>{" is registered, we've sent reset instructions."}
        </p>

        {/* Dev-mode helper */}
        {devToken && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-left">
            <p className="mb-2 text-xs font-semibold text-amber-700">
              🛠 Development mode — reset token:
            </p>
            <code className="block break-all rounded bg-amber-100 p-2 text-xs text-amber-900">
              {devToken}
            </code>
            <Link
              to={`/reset-password?token=${devToken}`}
              className="btn-primary mt-3 w-full text-xs"
            >
              Use this token →
            </Link>
          </div>
        )}

        <Link to="/login" className="btn-secondary w-full gap-2">
          <FaArrowLeft className="h-3.5 w-3.5" />
          Back to Login
        </Link>
      </div>
    )
  }

  return (
    <div>
      <Link
        to="/login"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        <FaArrowLeft className="h-3 w-3" /> Back to login
      </Link>

      <h2 className="mb-1 text-2xl font-bold text-gray-900">Forgot password?</h2>
      <p className="mb-6 text-sm text-gray-500">
        {"Enter your email and we'll send you a reset link."}
      </p>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <FormField
          label="Email address"
          id="email"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="you@example.com"
          icon={FaEnvelope}
          value={values.email}
          onChange={handleChange}
          onBlur={handleBlur}
          error={errors.email}
          touched={touched.email}
        />

        <button
          type="submit"
          disabled={forgotPassword.isPending}
          className="btn-primary w-full py-3"
        >
          {forgotPassword.isPending ? (
            <><LoadingSpinner size="sm" color="white" /> Sending…</>
          ) : (
            'Send Reset Link'
          )}
        </button>
      </form>
    </div>
  )
}
