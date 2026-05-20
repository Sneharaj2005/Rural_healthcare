/**
 * useAuth — centralised authentication hook.
 *
 * Wraps all auth API calls and keeps the Zustand store in sync.
 * Import this instead of calling api directly from pages.
 */
import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '../lib/axios'
import { useAuthStore } from '../store/authStore'
import { SUPPORTED_LANGUAGES } from '../i18n/index'
import i18n from '../i18n/index'

export function useAuth() {
  const navigate  = useNavigate()
  const { setAuth, logout: clearAuth, user, token, isAuthenticated, isTokenExpired } =
    useAuthStore()

  // ── Register ──────────────────────────────────────────────────────────────
  const registerMutation = useMutation({
    mutationFn: (data) => api.post('/auth/register', data).then((r) => r.data),
    onSuccess: (data) => {
      setAuth(data.user, data.access_token, data.expires_in)
      toast.success(`Welcome, ${data.user.full_name}!`)
      navigate('/dashboard')
    },
    onError: (err) => {
      const msg = err.response?.data?.message || err.response?.data?.detail || 'Registration failed.'
      toast.error(msg)
    },
  })

  // ── Login ─────────────────────────────────────────────────────────────────
  const loginMutation = useMutation({
    mutationFn: ({ email, password }) => {
      const form = new URLSearchParams()
      form.append('username', email)
      form.append('password', password)
      return api
        .post('/auth/login', form, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
        .then((r) => r.data)
    },
    onSuccess: (data, variables) => {
      setAuth(data.user, data.access_token, data.expires_in)
      // Apply user's stored language preference
      const lang = data.user?.preferred_language
      if (lang && SUPPORTED_LANGUAGES.find(l => l.code === lang)) {
        i18n.changeLanguage(lang)
        localStorage.setItem('rhc-language', lang)
      }
      toast.success(`Welcome back, ${data.user.full_name}!`)
      navigate(variables._redirectTo || '/dashboard', { replace: true })
    },
    onError: (err) => {
      const msg = err.response?.data?.message || err.response?.data?.detail || 'Login failed.'
      toast.error(msg)
    },
  })

  // ── Logout ────────────────────────────────────────────────────────────────
  const logoutMutation = useMutation({
    mutationFn: () => api.post('/auth/logout').catch(() => {}),  // best-effort
    onSettled: () => {
      clearAuth()
      navigate('/')
      toast.success('Logged out successfully.')
    },
  })

  // ── Forgot password ───────────────────────────────────────────────────────
  const forgotPasswordMutation = useMutation({
    mutationFn: (email) => api.post('/auth/forgot-password', { email }).then((r) => r.data),
    onSuccess: (data) => {
      toast.success('Reset instructions sent if that email exists.')
      return data   // caller can read dev_reset_token in dev mode
    },
    onError: () => toast.error('Something went wrong. Please try again.'),
  })

  // ── Reset password ────────────────────────────────────────────────────────
  const resetPasswordMutation = useMutation({
    mutationFn: ({ token: resetToken, new_password }) =>
      api.post('/auth/reset-password', { token: resetToken, new_password }).then((r) => r.data),
    onSuccess: () => {
      toast.success('Password reset! You can now log in.')
      navigate('/login')
    },
    onError: (err) => {
      const msg = err.response?.data?.message || 'Invalid or expired reset link.'
      toast.error(msg)
    },
  })

  // ── Change password ───────────────────────────────────────────────────────
  const changePasswordMutation = useMutation({
    mutationFn: (data) => api.post('/auth/change-password', data).then((r) => r.data),
    onSuccess: () => toast.success('Password changed successfully.'),
    onError: (err) => {
      const msg = err.response?.data?.message || 'Failed to change password.'
      toast.error(msg)
    },
  })

  // ── Verify token ──────────────────────────────────────────────────────────
  const verifyToken = useCallback(async () => {
    if (!token || isTokenExpired()) return false
    try {
      const { data } = await api.post('/auth/verify-token', { token })
      return data.valid
    } catch {
      return false
    }
  }, [token, isTokenExpired])

  return {
    user,
    token,
    isAuthenticated,
    isTokenExpired,
    // mutations
    register:       registerMutation,
    login:          loginMutation,
    logout:         logoutMutation,
    forgotPassword: forgotPasswordMutation,
    resetPassword:  resetPasswordMutation,
    changePassword: changePasswordMutation,
    verifyToken,
  }
}
