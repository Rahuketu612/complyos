"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuthStore } from "@/store/auth-store"
import { useWorkspaceStore } from "@/stores/workspace-store"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { 
  ShieldCheck, AlertTriangle, Clock, Briefcase, Bell,
  CheckCircle2, ArrowRight, Loader2, AlertCircle
} from "lucide-react"

// Types
interface Stats {
  totalWorkspaces: number
  activeWorkspaces: number
  totalTasks: number
  pendingTasks: number
  overdueTasks: number
  documents: number
  notifications: number
}

interface Task { id: string; title: string; status: string; priority: string; dueDate?: string; daysOverdue?: number }
interface Notice { id: string; type: string; dueDate: string }

// Loading skeleton
function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse bg-muted rounded", className)} />
}

// Priority badge with clearer styling
function PriorityBadge({ priority }: { priority: string }) {
  const colors = { 
    URGENT: "bg-red-500 text-white", 
    HIGH: "bg-orange-500 text-white", 
    MEDIUM: "bg-yellow-500 text-black", 
    LOW: "bg-gray-100 text-gray-700" 
  }
  return (
    <span className={cn("px-2 py-0.5 rounded text-xs font-semibold", colors[priority as keyof typeof colors] || colors.LOW)}>
      {priority}
    </span>
  )
}

// Clean task item with clear visual hierarchy
function TaskItem({ task, onClick }: { task: Task; onClick?: () => void }) {
  const isOverdue = task.daysOverdue && task.daysOverdue > 0
  return (
    <div 
      className={cn(
        "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors",
        isOverdue ? "border-red-200 bg-red-50 hover:bg-red-100" : "border-slate-200 hover:bg-slate-50"
      )}
      onClick={onClick}
    >
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{task.title}</div>
        <div className="flex items-center gap-2 mt-1">
          {isOverdue && (
            <span className="text-xs text-red-600 font-medium flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {task.daysOverdue}d overdue
            </span>
          )}
          {!isOverdue && task.dueDate && (
            <span className="text-xs text-muted-foreground">
              Due {new Date(task.dueDate).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
      <PriorityBadge priority={task.priority} />
    </div>
  )
}

// Primary action button
function PrimaryAction({ label, href, icon: Icon, variant = "default" }: { label: string; href: string; icon: any; variant?: "default" | "destructive" }) {
  const router = useRouter()
  return (
    <Button 
      onClick={() => router.push(href)}
      className={cn("gap-2", variant === "destructive" && "bg-red-500 hover:bg-red-600")}
    >
      {label}
      <Icon className="h-4 w-4" />
    </Button>
  )
}

// Main Component
export default function DashboardPage() {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()
  const { selectedWorkspace } = useWorkspaceStore()
  
  const [stats, setStats] = useState<Stats>({
    totalWorkspaces: 0, activeWorkspaces: 0, totalTasks: 0,
    pendingTasks: 0, overdueTasks: 0, documents: 0, notifications: 0
  })
  const [tasks, setTasks] = useState<Task[]>([])
  const [notices, setNotices] = useState<Notice[]>([])
  const [loading, setLoading] = useState(true)

  const [complianceScore, setComplianceScore] = useState(85)
  const [complianceChange, setComplianceChange] = useState(5)
  const [gstFiled, setGstFiled] = useState(12)
  const [gstChange, setGstChange] = useState(3)
  const [noticesPending, setNoticesPending] = useState(2)
  const [noticesChange, setNoticesChange] = useState(-1)
  const [itcAtRisk, setItcAtRisk] = useState(45000)
  const [itcChange, setItcChange] = useState(-2000)

  useEffect(() => {
    if (!isAuthenticated) { router.push("/"); return }
    
    const fetchData = async () => {
      try {
        const res = await api.get<any>("/api/ca/dashboard/widgets").catch(() => null)
        if (res && res.stats) {
          setStats({
            totalWorkspaces: res.stats.totalWorkspaces || 0,
            activeWorkspaces: res.stats.activeWorkspaces || 0,
            totalTasks: res.stats.totalTasks || 0,
            pendingTasks: res.stats.pendingTasksCount || 0,
            overdueTasks: res.stats.overdueTasksCount || 0,
            documents: res.stats.documentsCount || 0,
            notifications: res.stats.unreadNotifications || 0
          })
          setTasks(res.pendingTasks || [])
          setNotices(res.recentNotices || [])
        }
      } catch (err) {
        console.error("Fetch error:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [isAuthenticated, router])

  // Calculate quick stats
  const completedTasks = stats.totalTasks - stats.pendingTasks - stats.overdueTasks

  return (
    <div className="space-y-8">
      {/* Header - Clean and focused */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {selectedWorkspace ? `Workspace: ${selectedWorkspace.name}` : "Your compliance overview"}
          </p>
        </div>
        {stats.notifications > 0 && (
          <Button variant="outline" size="sm" onClick={() => router.push('/notifications')} className="gap-2">
            <Bell className="h-4 w-4" />
            {stats.notifications} notifications
          </Button>
        )}
      </div>

      {/* TOP 3 PRIORITY ACTIONS - Most important first */}
      {(stats.overdueTasks > 0 || notices.length > 0) && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Action Required</h2>
          
          {stats.overdueTasks > 0 && (
            <Card className="border-red-200 bg-red-50/30">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-red-100">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-red-700">{stats.overdueTasks} overdue tasks</div>
                    <div className="text-sm text-muted-foreground">Needs immediate attention</div>
                  </div>
                </div>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => router.push('/tasks?filter=overdue')}
                  className="gap-2"
                >
                  View Tasks <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          )}

          {notices.length > 0 && (
            <Card className="border-orange-200 bg-orange-50/30">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-orange-100">
                    <Bell className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <div className="font-semibold">{notices.length} pending notices</div>
                    <div className="text-sm text-muted-foreground">Response may be required</div>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => router.push('/notices')}
                  className="gap-2"
                >
                  View Notices <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Quick Stats - Simplified to essential metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Clients</p>
                <p className="text-2xl font-bold">{stats.activeWorkspaces}</p>
              </div>
              <div className="p-2 rounded-lg bg-blue-50">
                <Briefcase className="h-5 w-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Tasks</p>
                <p className="text-2xl font-bold">{stats.pendingTasks}</p>
              </div>
              <div className="p-2 rounded-lg bg-purple-50">
                <Clock className="h-5 w-5 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{completedTasks}</p>
              </div>
              <div className="p-2 rounded-lg bg-green-50">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Documents</p>
                <p className="text-2xl font-bold">{stats.documents}</p>
              </div>
              <div className="p-2 rounded-lg bg-amber-50">
                <Bell className="h-5 w-5 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tasks Section - Clean and actionable */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Upcoming Tasks</h2>
          <Button variant="ghost" size="sm" onClick={() => router.push('/tasks')} className="gap-2">
            View all <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
        
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        ) : tasks.length > 0 ? (
          <div className="space-y-2">
            {tasks.slice(0, 5).map((task) => (
              <TaskItem 
                key={task.id} 
                task={task}
                onClick={() => router.push(`/tasks?id=${task.id}`)}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-3" />
              <p className="font-medium text-muted-foreground">All caught up!</p>
              <p className="text-sm text-muted-foreground mt-1">No pending tasks</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick Links - Simple navigation */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Quick Links</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Button variant="outline" className="h-auto py-4 justify-start" onClick={() => router.push('/businesses')}>
            <Briefcase className="h-4 w-4 mr-3" />
            <span className="text-sm">Manage Clients</span>
          </Button>
          <Button variant="outline" className="h-auto py-4 justify-start" onClick={() => router.push('/gst/returns')}>
            <Bell className="h-4 w-4 mr-3" />
            <span className="text-sm">GST Returns</span>
          </Button>
          <Button variant="outline" className="h-auto py-4 justify-start" onClick={() => router.push('/vendors')}>
            <Briefcase className="h-4 w-4 mr-3" />
            <span className="text-sm">Vendors</span>
          </Button>
          <Button variant="outline" className="h-auto py-4 justify-start" onClick={() => router.push('/documents')}>
            <Bell className="h-4 w-4 mr-3" />
            <span className="text-sm">Documents</span>
          </Button>
        </div>
      </div>
    </div>
  )
}