"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/store/auth-store"
import { useWorkspaceStore } from "@/stores/workspace-store"
import { useCaWorkspaces } from "@/hooks/use-ca-service"
import { useBusinesses } from "@/hooks/use-businesses"
import { 
  LayoutDashboard, 
  Building2, 
  Receipt, 
  AlertCircle,
  AlertTriangle,
  Users, 
  Bot, 
  Settings,
  LogOut,
  Loader2,
  Plus,
  Briefcase,
  ChevronDown
} from "lucide-react"
import { getRoleBadgeColor, getRoleDisplayName } from "@/stores/workspace-store"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/businesses", label: "Businesses", icon: Building2 },
  { href: "/gst/returns", label: "GST Returns", icon: Receipt },
  { href: "/gst/notices", label: "GST Notices", icon: AlertCircle },
  { href: "/notices", label: "Notices", icon: AlertTriangle },
  { href: "/workspaces", label: "Workspaces", icon: Briefcase },
  { href: "/tasks", label: "Tasks", icon: AlertCircle },
  { href: "/documents", label: "Documents", icon: Users },
  { href: "/vendors", label: "Vendors", icon: Users },
  { href: "/ai", label: "AI Assistant", icon: Bot },
  { href: "/settings", label: "Settings", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, selectedBusinessId, selectedBusinessName, setSelectedBusiness, logout } = useAuthStore()
  const { selectedWorkspace, setSelectedWorkspace } = useWorkspaceStore()
  const { data: bizData, isLoading: bizLoading, isError: bizError, error: bizErrorMsg } = useBusinesses()
  const { workspaces: caWorkspaces, loading: wsLoading, error: wsError } = useCaWorkspaces()
  const [showWorkspaceDropdown, setShowWorkspaceDropdown] = useState(false)

  // Auto-select first valid business
  const businesses = bizData?.businesses || []
  useEffect(() => {
    if (bizData && businesses.length > 0) {
      if (!selectedBusinessId || !businesses.find(b => b.id === selectedBusinessId)) {
        setSelectedBusiness(businesses[0].id, businesses[0].name)
      }
    }
  }, [bizData, businesses.length, selectedBusinessId, setSelectedBusiness])

  // Sync workspaces from API
  useEffect(() => {
    if (caWorkspaces && caWorkspaces.length > 0) {
      const wsContext = caWorkspaces.map(ws => ({
        id: ws.id,
        name: ws.name,
        type: ws.type,
        role: 'user' as const,
        complianceScore: ws.complianceScore
      }))
      // Only update if not already set
      if (!selectedWorkspace) {
        setSelectedWorkspace(wsContext[0])
      }
    }
  }, [caWorkspaces, selectedWorkspace, setSelectedWorkspace])

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  const handleBusinessSelect = (bizId: string, bizName: string) => {
    setSelectedBusiness(bizId, bizName)
  }

  const handleWorkspaceSelect = (workspace: any) => {
    setSelectedWorkspace(workspace)
    setShowWorkspaceDropdown(false)
  }

  return (
    <aside className="w-64 min-h-screen border-r bg-card flex flex-col">
      <div className="p-6">
        <h1 className="text-xl font-bold">COMPLYOS</h1>
        <p className="text-xs text-muted-foreground">Compliance Platform</p>
      </div>
      
      {/* Business Selector */}
      <div className="px-3 mb-2">
        <label className="text-xs text-muted-foreground mb-1 block">Active Business</label>
        {bizLoading ? (
          <div className="flex items-center gap-2 text-sm py-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading...
          </div>
        ) : bizError ? (
          <div className="text-sm py-2 text-red-500">Failed to load</div>
        ) : businesses.length > 0 ? (
          <select 
            className="w-full text-sm border rounded-lg px-2 py-2 bg-background"
            value={selectedBusinessId || ""}
            onChange={(e) => {
              const biz = businesses.find(b => b.id === e.target.value)
              if (biz) handleBusinessSelect(biz.id, biz.name)
            }}
          >
            {businesses.map(biz => (
              <option key={biz.id} value={biz.id}>{biz.name}</option>
            ))}
          </select>
        ) : (
          <div className="space-y-2">
            <div className="text-sm py-2 text-muted-foreground">No businesses</div>
            <button 
              onClick={() => router.push("/businesses")}
              className="flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <Plus className="h-4 w-4" />
              Create Business
            </button>
          </div>
        )}
      </div>

      {/* Workspace Selector */}
      <div className="px-3 mb-4">
        <label className="text-xs text-muted-foreground mb-1 block">Current Workspace</label>
        {wsLoading ? (
          <div className="flex items-center gap-2 text-sm py-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading...
          </div>
        ) : caWorkspaces && caWorkspaces.length > 0 ? (
          <div className="relative">
            <button
              onClick={() => setShowWorkspaceDropdown(!showWorkspaceDropdown)}
              className="w-full text-sm border rounded-lg px-2 py-2 bg-background flex items-center justify-between"
            >
              <span className="truncate">
                {selectedWorkspace?.name || 'Select workspace'}
              </span>
              <ChevronDown className="h-4 w-4 flex-shrink-0" />
            </button>
            {showWorkspaceDropdown && (
              <div className="absolute z-50 w-full mt-1 bg-popover border rounded-lg shadow-lg max-h-60 overflow-auto">
                {caWorkspaces.map(ws => (
                  <button
                    key={ws.id}
                    onClick={() => handleWorkspaceSelect({
                      id: ws.id,
                      name: ws.name,
                      type: ws.type,
                      role: 'user',
                      complianceScore: ws.complianceScore
                    })}
                    className={cn(
                      "w-full text-left px-3 py-2 text-sm hover:bg-accent",
                      selectedWorkspace?.id === ws.id && "bg-accent"
                    )}
                  >
                    <div className="font-medium">{ws.name}</div>
                    <div className="text-xs text-muted-foreground">{ws.type}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm py-2 text-muted-foreground">No workspaces</div>
        )}
        
        {/* Role Badge */}
        {selectedWorkspace && (
          <div className="mt-2">
            <span className={cn(
              "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
              getRoleBadgeColor(selectedWorkspace.role)
            )}>
              {getRoleDisplayName(selectedWorkspace.role)}
            </span>
          </div>
        )}
      </div>
      
      <nav className="px-3 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 py-4 border-t">
        <button 
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
