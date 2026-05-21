import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  email: string
  firstName: string
  lastName?: string
}

interface AuthState {
  // Auth
  accessToken: string | null
  refreshToken: string | null
  user: User | null
  isAuthenticated: boolean
  
  // Business context
  selectedBusinessId: string | null
  selectedBusinessName: string | null
  
  // Actions
  login: (tokens: { accessToken: string; refreshToken?: string }, user: User) => void
  logout: () => void
  
  setSelectedBusiness: (id: string, name: string) => void
  clearSelectedBusiness: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // Initial state
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      
      selectedBusinessId: null,
      selectedBusinessName: null,
      
      // Login action
      login: (tokens, user) => set({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken || null,
        user,
        isAuthenticated: true,
      }),
      
      // Logout action
      logout: () => set({
        accessToken: null,
        refreshToken: null,
        user: null,
        isAuthenticated: false,
        selectedBusinessId: null,
        selectedBusinessName: null,
      }),
      
      // Business selection
      setSelectedBusiness: (id, name) => set({
        selectedBusinessId: id,
        selectedBusinessName: name,
      }),
      
      clearSelectedBusiness: () => set({
        selectedBusinessId: null,
        selectedBusinessName: null,
      }),
    }),
    {
      name: 'complyos-auth', // localStorage key
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        selectedBusinessId: state.selectedBusinessId,
        selectedBusinessName: state.selectedBusinessName,
      }),
    }
  )
)

// Helper hook for auth-protected routes
export function useIsAuthenticated() {
  return useAuthStore((state) => state.isAuthenticated)
}

export function useAccessToken() {
  return useAuthStore((state) => state.accessToken)
}