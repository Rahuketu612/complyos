"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/store/auth-store"
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
  ChevronDown,
  Loader2
} from "lucide-react"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/businesses", label: "Businesses", icon: Building2 },
  { href: "/gst/returns", label: "GST Returns", icon: Receipt },
  { href: "/gst/notices", label: "GST Notices", icon: AlertCircle },
  { href: "/vendors", label: "Vendors", icon: Users },
  { href: "/ai", label: "AI Assistant", icon: Bot },
  { href: "/settings", label: "Settings", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { isAuthenticated, user, selectedBusinessId, selectedBusinessName, setSelectedBusiness, logout } = useAuthStore()
  const { data: bizData, isLoading } = useBusinesses()

  // Auto-select first business if none selected
  const businesses = bizData?.businesses || []
  if (!selectedBusinessId && businesses.length > 0 && !isLoading) {
    // Can't call setState during render - use effect elsewhere
  }

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  const handleBusinessSelect = (bizId: string, bizName: string) => {
    setSelectedBusiness(bizId, bizName)
  }

  return (
    <aside className="w-64 min-h-screen border-r bg-card flex flex-col">
      <div className="p-6">
        <h1 className="text-xl font-bold">COMPLYOS</h1>
        <p className="text-xs text-muted-foreground">Compliance Platform</p>
      </div>
      
      {/* Business Selector */}
      <div className="px-3 mb-4">
        <label className="text-xs text-muted-foreground mb-1 block">Active Business</label>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm py-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading...
          </div>
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
          <div className="text-sm py-2 text-muted-foreground">No businesses</div>
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