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
  Users, 
  Bot, 
  Settings,
  LogOut,
  Loader2,
  Plus,
  Briefcase,
  ChevronDown,
  MessageSquare,
  FileText
} from "lucide-react"
import { getRoleBadgeColor, getRoleDisplayName } from "@/stores/workspace-store"

// Navigation groups - cleaner organization
const navGroups = [
  {
    label: "Main",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ]
  },
  {
    label: "Compliance",
    items: [
      { href: "/businesses", label: "Clients", icon: Building2 },
      { href: "/gst/returns", label: "GST Returns", icon: Receipt },
      { href: "/gst/notices", label: "GST Notices", icon: AlertCircle },
      { href: "/notices", label: "Notices", icon: AlertCircle },
      { href: "/tasks", label: "Tasks", icon: FileText },
      { href: "/vendors", label: "Vendors", icon: Users },
      { href: "/documents", label: "Documents", icon: Users },
    ]
  },
  {
    label: "Workspace",
    items: [
      { href: "/communications", label: "Messages", icon: MessageSquare },
      { href: "/workspaces", label: "Workspaces", icon: Briefcase },
      { href: "/ai", label: "AI Assistant", icon: Bot },
      { href: "/settings", label: "Settings", icon: Settings },
    ]
  },
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
    <aside className="w-56 min-h-screen border-r bg-card flex flex-col">
      {/* Logo */}
      <div className="px-4 py-5 border-b">
        <h1 className="text-lg font-bold tracking-tight">COMPLYOS</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Compliance Platform</p>
      </div>
      
      {/* Business Selector */}
      <div className="px-3 py-4 border-b">
        <label className="text-xs text-muted-foreground mb-2 block uppercase tracking-wide">Client</label>
        {bizLoading ? (
          <div className="flex items-center gap-2 text-sm py-2 text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Loading
          </div>
        ) : bizError ? (
          <div className="text-xs py-2 text-red-500">Failed to load</div>
        ) : businesses.length > 0 ? (
          <select 
            className="w-full text-sm border rounded-md px-2 py-1.5 bg-background focus:ring-2 focus:ring-primary focus:outline-none transition-all"
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
            <div className="text-xs py-2 text-muted-foreground">No clients</div>
            <button 
              onClick={() => router.push("/businesses")}
              className="flex items-center gap-2 text-xs text-primary hover:underline"
            >
              <Plus className="h-3 w-3" />
              Create Client
            </button>
          </div>
        )}
      </div>

      {/* Workspace Selector - Prominent */}
      <div className="px-3 py-4 border-b bg-muted/30">
        <label className="text-xs text-muted-foreground mb-2 block uppercase tracking-wide">Workspace</label>
        {wsLoading ? (
          <div className="flex items-center gap-2 text-xs py-2 text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Loading
          </div>
        ) : caWorkspaces && caWorkspaces.length > 0 ? (
          <div className="relative">
            <button
              onClick={() => setShowWorkspaceDropdown(!showWorkspaceDropdown)}
              className="w-full text-sm border rounded-md px-2 py-1.5 bg-background flex items-center justify-between hover:bg-accent transition-colors focus:ring-2 focus:ring-primary focus:outline-none"
            >
              <span className="truncate font-medium">
                {selectedWorkspace?.name || 'Select workspace'}
              </span>
              <ChevronDown className={cn("h-3 w-3 flex-shrink-0 transition-transform", showWorkspaceDropdown && "rotate-180")} />
            </button>
            {showWorkspaceDropdown && (
              <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md max-h-48 overflow-auto">
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
                      "w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors",
                      selectedWorkspace?.id === ws.id && "bg-accent font-medium"
                    )}
                  >
                    <div className="truncate">{ws.name}</div>
                    <div className="text-xs text-muted-foreground">{ws.type}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-xs py-2 text-muted-foreground">No workspaces</div>
        )}
        
        {/* Role Badge - Subtle */}
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
      
      {/* Navigation - Grouped */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.label}>
            <h3 className="text-xs text-muted-foreground uppercase tracking-wide mb-2 px-2">
              {group.label}
            </h3>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-all",
                      isActive 
                        ? "bg-primary/10 text-primary font-medium" 
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer - Sign Out */}
      <div className="px-3 py-3 border-t">
        <button 
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
