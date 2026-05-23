import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  email: string
  firstName: string
  lastName?: string
  role?: string
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
  
  // Workspace context (CA)
  selectedWorkspaceId: string | null
  selectedWorkspaceName: string | null
  
  // Actions
  login: (tokens: { accessToken: string; refreshToken?: string }, user: User) => Promise<void>
  logout: () => void
  
  setSelectedBusiness: (id: string, name: string) => void
  clearSelectedBusiness: () => void
  
  setSelectedWorkspace: (id: string, name: string) => void
  clearSelectedWorkspace: () => void
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
      
      selectedWorkspaceId: null,
      selectedWorkspaceName: null,
      
      // Login action
      login: async (tokens, user) => {
        // Sync session cookie for middleware
        if (typeof window !== 'undefined') {
          await fetch('/api/auth/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accessToken: tokens.accessToken, isAuthenticated: true }),
          }).catch(console.error);
        }
        set({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken || null,
          user,
          isAuthenticated: true,
        })
      },
      
      // Logout action
      logout: () => {
        // Clear session cookie for middleware
        if (typeof window !== 'undefined') {
          fetch('/api/auth/session', { method: 'DELETE' }).catch(console.error);
        }
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          isAuthenticated: false,
          selectedBusinessId: null,
          selectedBusinessName: null,
          selectedWorkspaceId: null,
          selectedWorkspaceName: null,
        })
      },
      
      // Business selection
      setSelectedBusiness: (id, name) => set({
        selectedBusinessId: id,
        selectedBusinessName: name,
      }),
      
      clearSelectedBusiness: () => set({
        selectedBusinessId: null,
        selectedBusinessName: null,
      }),
      
      // Workspace selection
      setSelectedWorkspace: (id, name) => set({
        selectedWorkspaceId: id,
        selectedWorkspaceName: name,
      }),
      
      clearSelectedWorkspace: () => set({
        selectedWorkspaceId: null,
        selectedWorkspaceName: null,
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
        selectedWorkspaceId: state.selectedWorkspaceId,
        selectedWorkspaceName: state.selectedWorkspaceName,
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
