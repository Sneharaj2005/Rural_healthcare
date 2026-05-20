import { getPasswordStrength } from '../../hooks/useFormValidation'

export default function PasswordStrength({ password }) {
  if (!password) return null
  const { label, color, pct } = getPasswordStrength(password)

  return (
    <div className="mt-2 space-y-1">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className={`h-full rounded-full transition-all duration-300 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-gray-500">
        Password strength: <span className="font-medium text-gray-700">{label}</span>
      </p>
    </div>
  )
}
