"use client"

import { useState, useEffect } from "react"
import { useAuthStore } from "@/store/auth-store"
import { api } from "@/lib/api"

interface Workspace {
  id: string
  name: string
  role: string
  firm: { name: string }
  business?: { name: string }
}

export function WorkspaceSelector() {
  const { isAuthenticated, selectedWorkspaceId, selectedWorkspaceName, setSelectedWorkspace } = useAuthStore()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isAuthenticated) {
      fetchWorkspaces()
    }
  }, [isAuthenticated])

  const fetchWorkspaces = async () => {
    setLoading(true)
    try {
      const response = await api.get<Workspace[]>("/api/ca/workspace/workspaces")
      setWorkspaces(response || [])
      // Auto-select first if none selected
      if (response && response.length > 0 && !selectedWorkspaceId) {
        setSelectedWorkspace(response[0].id, response[0].name)
      }
    } catch (err) {
      console.error("Workspaces fetch error:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = (workspace: Workspace) => {
    setSelectedWorkspace(workspace.id, workspace.name)
    setIsOpen(false)
  }

  if (!isAuthenticated) return null

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 text-left bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors flex items-center justify-between"
      >
        <span className="truncate text-sm font-medium">
          {selectedWorkspaceName || "Select Workspace"}
        </span>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-slate-200 z-40">
          <div className="p-2 max-h-64 overflow-y-auto">
            {loading ? (
              <div className="p-2 text-sm text-slate-500">Loading...</div>
            ) : workspaces.length > 0 ? (
              workspaces.map((workspace) => (
                <button
                  key={workspace.id}
                  onClick={() => handleSelect(workspace)}
                  className={`w-full p-2 text-left rounded hover:bg-slate-50 ${
                    selectedWorkspaceId === workspace.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="text-sm font-medium truncate">{workspace.name}</div>
                  <div className="text-xs text-slate-500">
                    {workspace.firm.name} • {workspace.role}
                  </div>
                </button>
              ))
            ) : (
              <div className="p-2 text-sm text-slate-500">No workspaces available</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}