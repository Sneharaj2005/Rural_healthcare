/**
 * useLanguage — language switching with backend sync.
 */
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '../lib/axios'
import { useAuthStore } from '../store/authStore'
import { SUPPORTED_LANGUAGES } from '../i18n/index'

export function useLanguage() {
  const { i18n, t } = useTranslation()
  const { isAuthenticated, updateUser } = useAuthStore()

  const syncMutation = useMutation({
    mutationFn: (lang) =>
      api.put('/users/me/language', { preferred_language: lang }).then((r) => r.data),
    onSuccess: (data) => {
      updateUser({ preferred_language: data.preferred_language })
    },
    onError: () => {
      // Silent — language already changed locally
    },
  })

  const changeLanguage = useCallback(
    async (langCode) => {
      if (!SUPPORTED_LANGUAGES.find((l) => l.code === langCode)) return
      await i18n.changeLanguage(langCode)
      localStorage.setItem('rhc-language', langCode)
      if (isAuthenticated) {
        syncMutation.mutate(langCode)
      }
      toast.success(t('profile.languageSaved'), { duration: 2000 })
    },
    [i18n, isAuthenticated, syncMutation, t]
  )

  const applyUserLanguage = useCallback(
    (user) => {
      const lang = user?.preferred_language
      if (lang && lang !== i18n.language) {
        i18n.changeLanguage(lang)
        localStorage.setItem('rhc-language', lang)
      }
    },
    [i18n]
  )

  const currentLang = SUPPORTED_LANGUAGES.find((l) => l.code === i18n.language)
    ?? SUPPORTED_LANGUAGES[0]

  return {
    currentLang,
    currentCode: i18n.language,
    languages: SUPPORTED_LANGUAGES,
    changeLanguage,
    applyUserLanguage,
    isSyncing: syncMutation.isPending,
  }
}
