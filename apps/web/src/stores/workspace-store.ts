/**
 * Workspace Context Store
 * Manages current workspace selection and role for CA Service
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface WorkspaceContext {
  id: string
  name: string
  type: string
  role: 'admin' | 'manager' | 'user' | 'viewer'
  complianceScore?: number
}

interface WorkspaceStore {
  selectedWorkspace: WorkspaceContext | null
  workspaces: WorkspaceContext[]
  setSelectedWorkspace: (workspace: WorkspaceContext | null) => void
  setWorkspaces: (workspaces: WorkspaceContext[]) => void
  clearWorkspace: () => void
}

export const useWorkspaceStore = create<WorkspaceStore>()(
  persist(
    (set) => ({
      selectedWorkspace: null,
      workspaces: [],
      setSelectedWorkspace: (workspace) => set({ selectedWorkspace: workspace }),
      setWorkspaces: (workspaces) => set({ workspaces }),
      clearWorkspace: () => set({ selectedWorkspace: null }),
    }),
    {
      name: 'complyos-workspace',
    }
  )
)

// Role badge helper
export function getRoleBadgeColor(role: string): string {
  switch (role) {
    case 'admin':
      return 'bg-purple-100 text-purple-800'
    case 'manager':
      return 'bg-blue-100 text-blue-800'
    case 'user':
      return 'bg-green-100 text-green-800'
    case 'viewer':
      return 'bg-gray-100 text-gray-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export function getRoleDisplayName(role: string): string {
  return role.charAt(0).toUpperCase() + role.slice(1)
}