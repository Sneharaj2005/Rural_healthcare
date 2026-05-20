import { useState } from 'react'
import { FaSave, FaLock, FaEye, FaEyeSlash, FaSignOutAlt } from 'react-icons/fa'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { useFormValidation, validators } from '../hooks/useFormValidation'
import FormField from '../components/common/FormField'
import PasswordStrength from '../components/common/PasswordStrength'
import LanguageSwitcher from '../components/common/LanguageSwitcher'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { useMutation } from '@tanstack/react-query'
import api from '../lib/axios'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'

// ── Profile update form ───────────────────────────────────────────────────────
const PROFILE_RULES = {
  full_name: [validators.required(), validators.minLength(2)],
  phone:     [validators.phone()],
}

// ── Change password form ──────────────────────────────────────────────────────
const PWD_RULES = {
  current_password: [validators.required('Current password is required.')],
  new_password:     [validators.password()],
  confirm_password: [
    validators.required('Please confirm your new password.'),
    validators.match('new_password', 'Passwords do not match.'),
  ],
}

function ProfileForm({ user, onUpdated }) {
  const { updateUser } = useAuthStore()
  const updateMutation = useMutation({
    mutationFn: (data) => api.put('/users/me', data).then((r) => r.data),
    onSuccess: (data) => { updateUser(data); toast.success('Profile updated.'); onUpdated?.() },
    onError: () => toast.error('Failed to update profile.'),
  })

  const { values, errors, touched, handleChange, handleBlur, validate } =
    useFormValidation({
      full_name:         user?.full_name || '',
      phone:             user?.phone || '',
      date_of_birth:     user?.date_of_birth || '',
      blood_group:       user?.blood_group || '',
      allergies:         user?.allergies || '',
      emergency_contact: user?.emergency_contact || '',
    }, PROFILE_RULES)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return
    updateMutation.mutate(values)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <h2 className="text-base font-semibold text-gray-900">Personal Information</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Full Name"
          id="full_name"
          name="full_name"
          type="text"
          placeholder="Jane Doe"
          value={values.full_name}
          onChange={handleChange}
          onBlur={handleBlur}
          error={errors.full_name}
          touched={touched.full_name}
        />
        <FormField
          label="Phone Number"
          id="phone"
          name="phone"
          type="tel"
          placeholder="+91 98765 43210"
          value={values.phone}
          onChange={handleChange}
          onBlur={handleBlur}
          error={errors.phone}
          touched={touched.phone}
        />
        <FormField
          label="Date of Birth"
          id="date_of_birth"
          name="date_of_birth"
          type="date"
          value={values.date_of_birth}
          onChange={handleChange}
          onBlur={handleBlur}
          error={errors.date_of_birth}
          touched={touched.date_of_birth}
        />
        <div>
          <label htmlFor="blood_group" className="mb-1.5 block text-sm font-medium text-gray-700">
            Blood Group
          </label>
          <select
            id="blood_group"
            name="blood_group"
            className="input-field"
            value={values.blood_group}
            onChange={handleChange}
          >
            <option value="">Select…</option>
            {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map((bg) => (
              <option key={bg}>{bg}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="allergies" className="mb-1.5 block text-sm font-medium text-gray-700">
          Known Allergies
        </label>
        <textarea
          id="allergies"
          name="allergies"
          rows={2}
          className="input-field resize-none"
          placeholder="e.g. Penicillin, Peanuts"
          value={values.allergies}
          onChange={handleChange}
        />
      </div>

      <FormField
        label="Emergency Contact"
        id="emergency_contact"
        name="emergency_contact"
        type="text"
        placeholder="Name — Phone number"
        value={values.emergency_contact}
        onChange={handleChange}
        onBlur={handleBlur}
        error={errors.emergency_contact}
        touched={touched.emergency_contact}
      />

      <div className="flex justify-end pt-2">
        <button type="submit" disabled={updateMutation.isPending} className="btn-primary gap-2">
          {updateMutation.isPending ? <LoadingSpinner size="sm" color="white" /> : <FaSave className="h-4 w-4" />}
          Save Changes
        </button>
      </div>
    </form>
  )
}

function ChangePasswordForm() {
  const { changePassword } = useAuth()
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew,     setShowNew]     = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const { values, errors, touched, handleChange, handleBlur, validate, reset } =
    useFormValidation({ current_password: '', new_password: '', confirm_password: '' }, PWD_RULES)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    await changePassword.mutateAsync({
      current_password: values.current_password,
      new_password:     values.new_password,
    }).then(() => reset()).catch(() => {})
  }

  const eyeBtn = (show, toggle, label) => (
    <button
      type="button"
      onClick={toggle}
      className="text-gray-400 hover:text-gray-600 focus:outline-none"
      aria-label={label}
    >
      {show ? <FaEyeSlash className="h-4 w-4" /> : <FaEye className="h-4 w-4" />}
    </button>
  )

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <h2 className="text-base font-semibold text-gray-900">Change Password</h2>

      <FormField
        label="Current Password"
        id="current_password"
        name="current_password"
        type={showCurrent ? 'text' : 'password'}
        placeholder="••••••••"
        icon={FaLock}
        value={values.current_password}
        onChange={handleChange}
        onBlur={handleBlur}
        error={errors.current_password}
        touched={touched.current_password}
        rightElement={eyeBtn(showCurrent, () => setShowCurrent(v => !v), 'Toggle current password')}
      />

      <div>
        <FormField
          label="New Password"
          id="new_password"
          name="new_password"
          type={showNew ? 'text' : 'password'}
          placeholder="Min. 8 characters"
          icon={FaLock}
          value={values.new_password}
          onChange={handleChange}
          onBlur={handleBlur}
          error={errors.new_password}
          touched={touched.new_password}
          rightElement={eyeBtn(showNew, () => setShowNew(v => !v), 'Toggle new password')}
        />
        <PasswordStrength password={values.new_password} />
      </div>

      <FormField
        label="Confirm New Password"
        id="confirm_password"
        name="confirm_password"
        type={showConfirm ? 'text' : 'password'}
        placeholder="Repeat new password"
        icon={FaLock}
        value={values.confirm_password}
        onChange={handleChange}
        onBlur={handleBlur}
        error={errors.confirm_password}
        touched={touched.confirm_password}
        rightElement={eyeBtn(showConfirm, () => setShowConfirm(v => !v), 'Toggle confirm password')}
      />

      <div className="flex justify-end pt-2">
        <button type="submit" disabled={changePassword.isPending} className="btn-primary gap-2">
          {changePassword.isPending ? <LoadingSpinner size="sm" color="white" /> : <FaLock className="h-4 w-4" />}
          Update Password
        </button>
      </div>
    </form>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { user } = useAuthStore()
  const { logout } = useAuth()
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('profile')

  const tabs = [
    { id: 'profile',  label: t('profile.title') },
    { id: 'security', label: t('profile.security') },
    { id: 'language', label: t('common.language') },
  ]

  return (
    <div className="page-content max-w-2xl">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-600 text-xl font-bold text-white">
            {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{user?.full_name}</h1>
            <p className="text-sm text-gray-500">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={() => logout.mutate()}
          className="btn-danger gap-2 text-sm"
        >
          <FaSignOutAlt className="h-3.5 w-3.5" />
          Logout
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-xl bg-gray-100 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="card">
        {activeTab === 'profile'  && <ProfileForm user={user} />}
        {activeTab === 'security' && <ChangePasswordForm />}
        {activeTab === 'language' && <LanguageTab />}
      </div>
    </div>
  )
}

function LanguageTab() {
  const { t } = useTranslation()
  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-gray-900">{t('profile.language')}</h2>
      <p className="text-sm text-gray-500">
        Choose your preferred language. The UI and AI responses will adapt accordingly.
      </p>
      <LanguageSwitcher variant="profile" />
    </div>
  )
}
