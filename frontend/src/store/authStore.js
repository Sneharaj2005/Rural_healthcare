import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user:            null,
      token:           null,
      tokenExpiresAt:  null,   // ISO timestamp
      isAuthenticated: false,

      setAuth: (user, token, expiresIn = 604800) => {
        const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()
        set({ user, token, tokenExpiresAt: expiresAt, isAuthenticated: true })
      },

      updateUser: (updates) =>
        set((state) => ({ user: { ...state.user, ...updates } })),

      logout: () =>
        set({ user: null, token: null, tokenExpiresAt: null, isAuthenticated: false }),

      getToken: () => get().token,

      isTokenExpired: () => {
        const exp = get().tokenExpiresAt
        if (!exp) return true
        return new Date(exp) < new Date()
      },
    }),
    {
      name: 'rhc-auth',
      partialize: (state) => ({
        user:            state.user,
        token:           state.token,
        tokenExpiresAt:  state.tokenExpiresAt,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
