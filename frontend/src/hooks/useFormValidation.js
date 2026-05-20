/**
 * useFormValidation — lightweight client-side form validation hook.
 *
 * Usage:
 *   const { values, errors, touched, handleChange, handleBlur, validate, reset } =
 *     useFormValidation(initialValues, rules)
 */
import { useState, useCallback } from 'react'

// ── Built-in validators ───────────────────────────────────────────────────────
export const validators = {
  required: (msg = 'This field is required.') =>
    (v) => (!v || !String(v).trim() ? msg : null),

  email: (msg = 'Enter a valid email address.') =>
    (v) => (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? msg : null),

  minLength: (n, msg) =>
    (v) => (String(v || '').length < n ? (msg || `Minimum ${n} characters required.`) : null),

  maxLength: (n, msg) =>
    (v) => (String(v || '').length > n ? (msg || `Maximum ${n} characters allowed.`) : null),

  match: (otherField, msg = 'Fields do not match.') =>
    (v, allValues) => (v !== allValues[otherField] ? msg : null),

  password: () => (v) => {
    if (!v) return 'Password is required.'
    if (v.length < 8)              return 'At least 8 characters required.'
    if (!/[A-Z]/.test(v))          return 'At least one uppercase letter required.'
    if (!/[a-z]/.test(v))          return 'At least one lowercase letter required.'
    if (!/\d/.test(v))             return 'At least one number required.'
    return null
  },

  phone: (msg = 'Enter a valid phone number.') =>
    (v) => (v && !/^[+\d\s\-()]{7,15}$/.test(v) ? msg : null),
}

// ── Password strength scorer ──────────────────────────────────────────────────
export function getPasswordStrength(password) {
  if (!password) return { score: 0, label: '', color: '' }
  let score = 0
  if (password.length >= 8)       score++
  if (password.length >= 12)      score++
  if (/[A-Z]/.test(password))     score++
  if (/[a-z]/.test(password))     score++
  if (/\d/.test(password))        score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  if (score <= 2) return { score, label: 'Weak',   color: 'bg-red-500',    pct: 25 }
  if (score <= 3) return { score, label: 'Fair',   color: 'bg-amber-500',  pct: 50 }
  if (score <= 4) return { score, label: 'Good',   color: 'bg-yellow-400', pct: 75 }
  return           { score, label: 'Strong', color: 'bg-primary-500', pct: 100 }
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useFormValidation(initialValues, rules = {}) {
  const [values,  setValues]  = useState(initialValues)
  const [errors,  setErrors]  = useState({})
  const [touched, setTouched] = useState({})

  const validateField = useCallback(
    (name, value, allValues) => {
      const fieldRules = rules[name] || []
      for (const rule of fieldRules) {
        const error = rule(value, allValues)
        if (error) return error
      }
      return null
    },
    [rules]
  )

  const handleChange = useCallback(
    (e) => {
      const { name, value, type, checked } = e.target
      const newVal = type === 'checkbox' ? checked : value
      setValues((prev) => {
        const next = { ...prev, [name]: newVal }
        // Re-validate touched field on change
        if (touched[name]) {
          setErrors((errs) => ({
            ...errs,
            [name]: validateField(name, newVal, next),
          }))
        }
        return next
      })
    },
    [touched, validateField]
  )

  const handleBlur = useCallback(
    (e) => {
      const { name } = e.target
      setTouched((prev) => ({ ...prev, [name]: true }))
      setErrors((prev) => ({
        ...prev,
        [name]: validateField(name, values[name], values),
      }))
    },
    [values, validateField]
  )

  const validate = useCallback(() => {
    const newErrors = {}
    let valid = true
    const allTouched = {}

    for (const name of Object.keys(rules)) {
      allTouched[name] = true
      const error = validateField(name, values[name], values)
      if (error) {
        newErrors[name] = error
        valid = false
      }
    }

    setTouched(allTouched)
    setErrors(newErrors)
    return valid
  }, [rules, values, validateField])

  const reset = useCallback(() => {
    setValues(initialValues)
    setErrors({})
    setTouched({})
  }, [initialValues])

  const setFieldValue = useCallback((name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }))
  }, [])

  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    validate,
    reset,
    setFieldValue,
    isFieldInvalid: (name) => !!(touched[name] && errors[name]),
    getFieldProps:  (name) => ({
      name,
      value:    values[name] ?? '',
      onChange: handleChange,
      onBlur:   handleBlur,
    }),
  }
}
