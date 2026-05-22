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
  ShieldCheck, FileText, AlertTriangle, TrendingDown,
  CheckCircle2, Clock, Briefcase, Bell, AlertCircle,
  FileWarning, ArrowUpRight, ArrowDownRight, Loader2
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

// Helpers
function LoadingCard({ title, icon: Icon }: { title: string; icon: any }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="animate-pulse h-8 bg-muted rounded" />
      </CardContent>
    </Card>
  )
}

function StatCard({ title, value, change, icon: Icon, color, loading }: { 
  title: string; value: string|number; change?: number; icon: any; color: string; loading?: boolean 
}) {
  if (loading) return <LoadingCard title={title} icon={Icon} />
  const isPositive = change && change > 0
  const isNegative = change && change < 0
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={color} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change !== undefined && (
          <div className="flex items-center gap-1 mt-1">
            {isPositive && <ArrowUpRight className="h-3 w-3 text-green-500" />}
            {isNegative && <ArrowDownRight className="h-3 w-3 text-red-500" />}
            <span className={cn("text-xs", isPositive ? "text-green-600" : isNegative ? "text-red-600" : "text-muted-foreground")}>
              {change > 0 ? '+' : ''}{change}%
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function SectionHeader({ icon: Icon, title, color }: { icon: any; title: string; color: string }) {
  return (
    <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
      <div className={cn("p-1.5 rounded-lg", color)}><Icon className="h-4 w-4 text-white" /></div>
      {title}
    </h2>
  )
}

function TaskItem({ task }: { task: Task }) {
  const priorityColors = { URGENT: "bg-red-100 text-red-700", HIGH: "bg-orange-100 text-orange-700", MEDIUM: "bg-yellow-100 text-yellow-700", LOW: "bg-blue-100 text-blue-700" }
  const isOverdue = task.daysOverdue && task.daysOverdue > 0
  return (
    <div className={cn("flex items-center justify-between p-3 rounded-lg border", isOverdue ? "border-red-200 bg-red-50/50" : "border-slate-200 bg-slate-50/50")}>
      <div>
        <div className="font-medium text-sm">{task.title}</div>
        {task.dueDate && (
          <span className={cn("text-xs", isOverdue ? "text-red-600" : "text-muted-foreground")}>
            {isOverdue ? `${task.daysOverdue}d overdue` : new Date(task.dueDate).toLocaleDateString()}
          </span>
        )}
      </div>
      <span className={cn("px-2 py-0.5 rounded text-xs font-medium", priorityColors[task.priority as keyof typeof priorityColors] || priorityColors.LOW)}>
        {task.priority}
      </span>
    </div>
  )
}

function WidgetBox({ title, icon: Icon, color, children }: { title: string; icon: any; color: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <div className={cn("p-1.5 rounded-lg", color)}><Icon className="h-4 w-4 text-white" /></div>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Compliance Command Center</h1>
          <p className="text-muted-foreground">
            {selectedWorkspace ? `Workspace: ${selectedWorkspace.name}` : "Overview of your compliance status"}
          </p>
        </div>
      </div>

      {/* Compliance Overview */}
      <SectionHeader icon={ShieldCheck} title="Compliance Overview" color="bg-green-500" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatCard title="Compliance Score" value={complianceScore + "%"} change={complianceChange} icon={ShieldCheck} color="text-green-500" loading={loading} />
        <StatCard title="Active Workspaces" value={stats.activeWorkspaces} icon={Briefcase} color="text-blue-500" loading={loading} />
        <StatCard title="GST Filed" value={gstFiled} change={gstChange} icon={FileText} color="text-blue-500" loading={loading} />
        <StatCard title="Notices Pending" value={noticesPending} change={noticesChange} icon={AlertTriangle} color="text-orange-500" loading={loading} />
        <StatCard title="ITC at Risk" value={"₹" + (itcAtRisk / 1000).toFixed(0) + "K"} change={itcChange} icon={TrendingDown} color="text-red-500" loading={loading} />
      </div>

      {/* GST Status + Tasks & Deadlines */}
      <div className="grid gap-6 lg:grid-cols-2">
        <WidgetBox title="GST Status" icon={FileText} color="bg-blue-500">
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{stats.overdueTasks}</div>
                <div className="text-xs text-muted-foreground">Overdue</div>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{noticesPending}</div>
                <div className="text-xs text-muted-foreground">Pending</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{gstFiled}</div>
                <div className="text-xs text-muted-foreground">Filed</div>
              </div>
            </div>
            {notices.slice(0, 3).map((n, i) => (
              <div key={i} className="flex items-center justify-between p-2 bg-red-50 rounded border border-red-100">
                <span className="text-sm">{n.type}</span>
                <span className="text-xs text-red-600">{n.dueDate ? new Date(n.dueDate).toLocaleDateString() : 'N/A'}</span>
              </div>
            ))}
          </div>
        </WidgetBox>

        <WidgetBox title="Tasks & Deadlines" icon={Clock} color="bg-purple-500">
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{stats.overdueTasks}</div>
                <div className="text-xs text-muted-foreground">Overdue</div>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{stats.pendingTasks}</div>
                <div className="text-xs text-muted-foreground">Pending</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {stats.totalTasks - stats.pendingTasks - stats.overdueTasks}
                </div>
                <div className="text-xs text-muted-foreground">Completed</div>
              </div>
            </div>
            {tasks.slice(0, 3).map((task) => <TaskItem key={task.id} task={task} />)}
            {!tasks.length && <p className="text-sm text-muted-foreground text-center py-4">No pending tasks</p>}
          </div>
        </WidgetBox>
      </div>

      {/* Client Workspaces */}
      <SectionHeader icon={Briefcase} title="Client Workspaces" color="bg-blue-500" />
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center justify-between">
            <div><div className="text-3xl font-bold">{stats.totalWorkspaces}</div><div className="text-sm text-muted-foreground">Total Workspaces</div></div>
            <Briefcase className="h-8 w-8 text-blue-500" />
          </div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center justify-between">
            <div><div className="text-3xl font-bold">{stats.activeWorkspaces}</div><div className="text-sm text-muted-foreground">Active</div></div>
            <CheckCircle2 className="h-8 w-8 text-green-500" />
          </div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center justify-between">
            <div><div className="text-3xl font-bold">{stats.totalTasks}</div><div className="text-sm text-muted-foreground">Total Tasks</div></div>
            <Clock className="h-8 w-8 text-purple-500" />
          </div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <div className="flex items-center justify-between">
            <div><div className="text-3xl font-bold">{stats.pendingTasks}</div><div className="text-sm text-muted-foreground">Pending Tasks</div></div>
            <AlertCircle className="h-8 w-8 text-orange-500" />
          </div>
        </Card>
      </div>
      <Button variant="outline" onClick={() => router.push('/workspaces')}>View All Workspaces</Button>

      {/* MSME Risk Alerts + Recent Notices */}
      <div className="grid gap-6 lg:grid-cols-2">
        <WidgetBox title="MSME Risk Alerts" icon={AlertTriangle} color="bg-orange-500">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
              <div><div className="text-2xl font-bold text-orange-600">0</div><div className="text-sm text-muted-foreground">MSME Alerts</div></div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
            <p className="text-sm text-muted-foreground text-center py-4">No MSME alerts</p>
          </div>
        </WidgetBox>

        <WidgetBox title="Recent Notices" icon={Bell} color="bg-red-500">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
              <div><div className="text-2xl font-bold text-red-600">{noticesPending}</div><div className="text-sm text-muted-foreground">Pending Notices</div></div>
              <Bell className="h-8 w-8 text-red-500" />
            </div>
            {notices.slice(0, 3).map((n, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-red-50/50 rounded-lg border border-red-100">
                <span className="text-sm">{n.type}</span>
                <span className="text-xs">{n.dueDate ? new Date(n.dueDate).toLocaleDateString() : 'N/A'}</span>
              </div>
            ))}
          </div>
        </WidgetBox>
      </div>

      {/* Security & Audit Status + Document Retention */}
      <div className="grid gap-6 lg:grid-cols-2">
        <WidgetBox title="Security & Audit Status" icon={ShieldCheck} color="bg-slate-600">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div><div className="text-sm font-medium">Audit Integrity</div><div className="text-lg font-bold text-green-600">Verified</div></div>
              <ShieldCheck className="h-8 w-8 text-green-500" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-slate-50 rounded-lg">
                <div className="text-lg font-bold">{stats.notifications}</div><div className="text-xs text-muted-foreground">Unread Alerts</div>
              </div>
              <div className="text-center p-3 bg-slate-50 rounded-lg">
                <div className="text-lg font-bold">Good</div><div className="text-xs text-muted-foreground">System Health</div>
              </div>
            </div>
          </div>
        </WidgetBox>

        <WidgetBox title="Document Retention" icon={FileWarning} color="bg-amber-500">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-amber-50 rounded-lg">
              <div><div className="text-2xl font-bold text-amber-600">{stats.documents}</div><div className="text-sm text-muted-foreground">Total Documents</div></div>
              <FileWarning className="h-8 w-8 text-amber-500" />
            </div>
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <div className="text-lg font-bold">0</div><div className="text-xs text-muted-foreground">Expiring Soon</div>
            </div>
            <Button variant="outline" size="sm" className="w-full" onClick={() => router.push('/documents')}>Manage Documents</Button>
          </div>
        </WidgetBox>
      </div>

      {/* Notifications */}
      <WidgetBox title="Recent Notifications" icon={Bell} color="bg-blue-500">
        <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
          <Bell className="h-5 w-5 text-blue-500" />
          <div className="flex-1">
            <div className="font-medium text-sm">{stats.notifications} unread notifications</div>
            <div className="text-xs text-muted-foreground">Check your notification center</div>
          </div>
          <Button size="sm" variant="ghost" onClick={() => router.push('/notifications')}>View</Button>
        </div>
      </WidgetBox>
    </div>
  )
}