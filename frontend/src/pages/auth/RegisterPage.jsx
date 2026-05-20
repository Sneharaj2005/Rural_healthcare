import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FaUser, FaEnvelope, FaLock, FaPhone, FaEye, FaEyeSlash } from 'react-icons/fa'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth'
import { useFormValidation, validators } from '../../hooks/useFormValidation'
import FormField from '../../components/common/FormField'
import PasswordStrength from '../../components/common/PasswordStrength'
import LoadingSpinner from '../../components/common/LoadingSpinner'

const RULES = {
  full_name:        [validators.required(), validators.minLength(2)],
  email:            [validators.required(), validators.email()],
  phone:            [validators.phone()],
  password:         [validators.password()],
  confirm_password: [
    validators.required('Please confirm your password.'),
    validators.match('password', 'Passwords do not match.'),
  ],
}
const INITIAL = { full_name: '', email: '', phone: '', password: '', confirm_password: '' }

export default function RegisterPage() {
  const { register } = useAuth()
  const { t } = useTranslation()
  const [showPwd,     setShowPwd]     = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const { values, errors, touched, handleChange, handleBlur, validate } =
    useFormValidation(INITIAL, RULES)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return
    // eslint-disable-next-line no-unused-vars
    const { confirm_password, ...payload } = values
    register.mutate(payload)
  }

  const eyeBtn = (show, toggle) => (
    <button type="button" onClick={toggle}
      className="text-gray-400 hover:text-gray-600 focus:outline-none">
      {show ? <FaEyeSlash className="h-4 w-4" /> : <FaEye className="h-4 w-4" />}
    </button>
  )

  return (
    <div>
      <h2 className="mb-1 text-2xl font-bold text-gray-900">{t('auth.createAccount')}</h2>
      <p className="mb-6 text-sm text-gray-500">{t('auth.registerSubtitle')}</p>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <FormField label={t('auth.fullName')} id="full_name" type="text" name="full_name"
          autoComplete="name" placeholder="Jane Doe" icon={FaUser}
          value={values.full_name} onChange={handleChange} onBlur={handleBlur}
          error={errors.full_name} touched={touched.full_name} />

        <FormField label={t('auth.email')} id="email" type="email" name="email"
          autoComplete="email" placeholder="you@example.com" icon={FaEnvelope}
          value={values.email} onChange={handleChange} onBlur={handleBlur}
          error={errors.email} touched={touched.email} />

        <FormField label={t('auth.phoneOptional')} id="phone" type="tel" name="phone"
          autoComplete="tel" placeholder="+91 98765 43210" icon={FaPhone}
          value={values.phone} onChange={handleChange} onBlur={handleBlur}
          error={errors.phone} touched={touched.phone} />

        <div>
          <FormField label={t('auth.password')} id="password"
            type={showPwd ? 'text' : 'password'} name="password"
            autoComplete="new-password" placeholder="Min. 8 characters" icon={FaLock}
            value={values.password} onChange={handleChange} onBlur={handleBlur}
            error={errors.password} touched={touched.password}
            rightElement={eyeBtn(showPwd, () => setShowPwd(v => !v))} />
          <PasswordStrength password={values.password} />
        </div>

        <FormField label={t('auth.confirmPassword')} id="confirm_password"
          type={showConfirm ? 'text' : 'password'} name="confirm_password"
          autoComplete="new-password" placeholder="Repeat your password" icon={FaLock}
          value={values.confirm_password} onChange={handleChange} onBlur={handleBlur}
          error={errors.confirm_password} touched={touched.confirm_password}
          rightElement={eyeBtn(showConfirm, () => setShowConfirm(v => !v))} />

        <button type="submit" disabled={register.isPending} className="btn-primary w-full py-3 mt-2">
          {register.isPending
            ? <><LoadingSpinner size="sm" color="white" /> {t('auth.creating')}</>
            : t('auth.createAccount')}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        {t('auth.alreadyHaveAccount')}{' '}
        <Link to="/login" className="font-medium text-primary-600 hover:text-primary-700">
          {t('auth.signIn')}
        </Link>
      </p>
    </div>
  )
}
