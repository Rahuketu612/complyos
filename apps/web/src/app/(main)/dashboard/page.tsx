"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  ShieldCheck, 
  FileText, 
  AlertTriangle, 
  TrendingDown, 
  CheckCircle,
  Loader2,
} from "lucide-react"
import { useDashboard, mockDashboardStats, DashboardStats, Activity } from "@/hooks/use-dashboard"

const statusIcons = {
  filed: { icon: CheckCircle, color: "text-green-500" },
  pending: { icon: AlertTriangle, color: "text-orange-500" },
  done: { icon: CheckCircle, color: "text-green-500" },
  verified: { icon: CheckCircle, color: "text-green-500" },
}

const stats = [
  { title: "Compliance Score", key: "complianceScore", suffix: "%", icon: ShieldCheck, color: "text-green-500" },
  { title: "GST Filed", key: "gstFiled", icon: FileText, color: "text-blue-500" },
  { title: "Notices Pending", key: "noticesPending", icon: AlertTriangle, color: "text-orange-500" },
  { title: "ITC at Risk", key: "itcAtRisk", icon: TrendingDown, color: "text-red-500" },
]

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

function ErrorCard({ title, error }: { title: string; error: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <AlertTriangle className="h-4 w-4 text-red-500" />
      </CardHeader>
      <CardContent>
        <p className="text-xs text-red-500">{error}</p>
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

// Demo badge
function DemoBadge() {
  return (
    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded ml-2">
      Demo
    </span>
  )
}

// ============ Stats mapping ============
const getStats = (data: DashboardStats | undefined) => [
  { title: "Compliance Score", value: data?.complianceScore ?? '-', change: data?.complianceChange, icon: ShieldCheck, color: "text-green-500" },
  { title: "GST Filed", value: data?.gstFiled ?? '-', change: data?.gstChange, icon: FileText, color: "text-blue-500" },
  { title: "Notices Pending", value: data?.noticesPending ?? '-', change: data?.noticesChange, icon: AlertTriangle, color: "text-orange-500" },
  { title: "ITC at Risk", value: data?.itcAtRisk ?? '-', change: data?.itcChange, icon: TrendingDown, color: "text-red-500" },
]

export default function DashboardPage() {
  const { data, isLoading } = useDashboard() 
  const stats = data || mockDashboardStats
  const statsList = getStats(data)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your compliance status</p>
        </div>
        {!isLoading && data !== mockDashboardStats && <DemoBadge />}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsList.map((stat) => {
          return (
            <StatCard
              key={stat.title}
              title={stat.title}
              value={stat.value}
              change={stat.change}
              icon={stat.icon}
              color={stat.color}
              loading={isLoading}
            />
          )
        })}
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader><CardTitle>Recent Compliance Activity</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(stats.recentActivity || mockDashboardStats.recentActivity).map((item: Activity) => {
              const config = statusIcons[item.status] || statusIcons.pending
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