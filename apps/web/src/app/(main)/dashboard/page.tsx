"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuthStore } from "@/store/auth-store"
import { api } from "@/lib/api"
import { 
  ShieldCheck, 
  FileText, 
  AlertTriangle, 
  TrendingDown, 
  CheckCircle,
  Loader2,
} from "lucide-react"

interface CaWidgetData {
  stats: {
    totalWorkspaces: number
    totalTasks: number
    pendingTasksCount: number
    overdueTasksCount: number
    documentsCount: number
    unreadNotifications: number
  }
  pendingTasks: any[]
  overdueCompliances: any[]
  recentNotices: any[]
  msmeAlerts: any[]
}

const statusIcons = {
  filed: { icon: CheckCircle, color: "text-green-500" },
  pending: { icon: AlertTriangle, color: "text-orange-500" },
  done: { icon: CheckCircle, color: "text-green-500" },
  verified: { icon: CheckCircle, color: "text-green-500" },
}

interface Activity {
  id: string
  action: string
  detail: string
  status: string
}

interface DashboardStats {
  complianceScore?: number
  gstFiled?: number
  noticesPending?: number
  itcAtRisk?: number
  complianceChange?: number
  gstChange?: number
  noticesChange?: number
  itcChange?: number
  recentActivity?: Activity[]
}

const mockDashboardStats: DashboardStats = {
  complianceScore: 85,
  gstFiled: 12,
  noticesPending: 2,
  itcAtRisk: 45000,
  complianceChange: 5,
  gstChange: 3,
  noticesChange: -1,
  itcChange: -2000,
  recentActivity: [
    { id: "1", action: "GSTR-3B Filed", detail: "May 2026", status: "filed" },
    { id: "2", action: "GST Notice Received", detail: "ARN-123456789", status: "pending" },
    { id: "3", action: "ITC Claimed", detail: "₹45,000", status: "done" },
  ],
}

function LoadingCard({ title }: { title: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="animate-pulse h-8 bg-muted rounded" />
      </CardContent>
    </Card>
  )
}

function StatCard({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  color,
  loading 
}: { 
  title: string
  value?: string | number
  change?: string | number
  icon: React.ElementType
  color: string
  loading?: boolean
}) {
  if (loading) return <LoadingCard title={title} />
  
  const displayValue = value !== undefined ? value : '-'
  const displayChange = change !== undefined ? (typeof change === 'number' ? (change > 0 ? `+${change}%` : `${change}%`) : change) : ''

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={color} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{displayValue}{typeof value === 'number' && '%'}</div>
        {displayChange && <p className="text-xs text-muted-foreground">{displayChange}</p>}
      </CardContent>
    </Card>
  )
}

const getStats = (data: DashboardStats | undefined) => [
  { title: "Compliance Score", value: data?.complianceScore ?? '-', change: data?.complianceChange, icon: ShieldCheck, color: "text-green-500" },
  { title: "GST Filed", value: data?.gstFiled ?? '-', change: data?.gstChange, icon: FileText, color: "text-blue-500" },
  { title: "Notices Pending", value: data?.noticesPending ?? '-', change: data?.noticesChange, icon: AlertTriangle, color: "text-orange-500" },
  { title: "ITC at Risk", value: data?.itcAtRisk ?? '-', change: data?.itcChange, icon: TrendingDown, color: "text-red-500" },
]

export default function DashboardPage() {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()
  const [caData, setCaData] = useState<CaWidgetData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/")
      return
    }
    fetchCaWidgets()
  }, [isAuthenticated, router])

  const fetchCaWidgets = async () => {
    try {
      const response = await api.get<CaWidgetData>("/api/ca/dashboard/widgets")
      setCaData(response)
    } catch (err) {
      console.error("CA widgets fetch error:", err)
    } finally {
      setLoading(false)
    }
  }

  const stats = mockDashboardStats
  const statsList = getStats(stats)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your compliance status</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsList.map((stat) => (
          <StatCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            change={stat.change}
            icon={stat.icon}
            color={stat.color}
            loading={false}
          />
        ))}
      </div>

      {/* CA Dashboard Widgets */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">CA Practice Overview</h2>
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">Workspaces</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '-' : caData?.stats.totalWorkspaces || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">Pending Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '-' : caData?.stats.pendingTasksCount || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">Overdue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{loading ? '-' : caData?.stats.overdueTasksCount || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">Notifications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '-' : caData?.stats.unreadNotifications || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Tasks Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                Pending Tasks
                <Button variant="ghost" size="sm" onClick={() => router.push("/tasks")}>
                  View All
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="animate-pulse space-y-2">
                  {[1, 2, 3].map(i => <div key={i} className="h-12 bg-slate-100 rounded"></div>)}
                </div>
              ) : caData?.pendingTasks && caData.pendingTasks.length > 0 ? (
                <div className="space-y-3">
                  {caData.pendingTasks.slice(0, 5).map((task) => (
                    <div key={task.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div>
                        <div className="font-medium text-sm">{task.title}</div>
                        <div className="text-xs text-slate-500">
                          {task.complianceType} • Due {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A'}
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded ${
                        task.priority === 'URGENT' ? 'bg-red-100 text-red-700' :
                        task.priority === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {task.priority}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-sm">No pending tasks</p>
              )}
            </CardContent>
          </Card>

          {/* Overdue Compliances */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-red-600">Overdue Compliances</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="animate-pulse space-y-2">
                  {[1, 2].map(i => <div key={i} className="h-12 bg-red-50 rounded"></div>)}
                </div>
              ) : caData?.overdueCompliances && caData.overdueCompliances.length > 0 ? (
                <div className="space-y-3">
                  {caData.overdueCompliances.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                      <div>
                        <div className="font-medium text-sm">{item.title}</div>
                        <div className="text-xs text-red-600">
                          {item.daysOverdue} days overdue
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-sm">No overdue items</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader><CardTitle>Recent Compliance Activity</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(stats.recentActivity ?? mockDashboardStats.recentActivity ?? []).map((item: Activity) => {
              const config = statusIcons[item.status as keyof typeof statusIcons] || statusIcons.pending
              const Icon = config.icon
              return (
                <div key={item.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <Icon className={`h-4 w-4 ${config.color}`} />
                    <span>{item.action}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{item.detail}</span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}