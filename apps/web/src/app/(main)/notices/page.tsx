"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuthStore } from "@/store/auth-store"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import {
  FileText, AlertTriangle, AlertCircle, CheckCircle2,
  Search, Filter, Clock, Calendar, DollarSign,
  ChevronRight, Loader2, RefreshCw, Plus, X
} from "lucide-react"

// Types
interface Notice {
  id: string
  noticeNumber?: string
  noticeType: string
  issuingAuthority?: string
  assessmentYear?: string
  severity: string
  status: string
  receivedDate: string
  responseDueDate?: string
  demandAmount?: number
  totalLiability?: number
  subject: string
  summary?: string
  workspace: { id: string; name: string; firm?: { name: string } }
  business?: { id: string; name: string; pan: string }
  assignee?: { id: string; firstName: string; lastName: string; email: string }
  _count?: { activities: number; linkedDocuments: number; linkedTasks: number }
}

interface NoticeStats {
  total: number
  byStatus: Record<string, number>
  bySeverity: Record<string, number>
  overdue: number
  dueThisWeek: number
  highSeverity: number
}

// Status helpers - simplified workflow with next action
const statusConfig: Record<string, { label: string; bg: string; text: string; icon: any; nextAction: string }> = {
  RECEIVED: { label: "Received", bg: "bg-blue-100", text: "text-blue-800", icon: FileText, nextAction: "Start Review" },
  UNDER_REVIEW: { label: "Under Review", bg: "bg-yellow-100", text: "text-yellow-800", icon: AlertTriangle, nextAction: "Prepare" },
  CLIENT_PENDING: { label: "Awaiting", bg: "bg-orange-100", text: "text-orange-800", icon: Clock, nextAction: "Follow Up" },
  DRAFT_PREPARED: { label: "Draft Ready", bg: "bg-purple-100", text: "text-purple-800", icon: FileText, nextAction: "Submit" },
  RESPONSE_FILED: { label: "Filed", bg: "bg-green-100", text: "text-green-800", icon: CheckCircle2, nextAction: "Monitor" },
  CLOSED: { label: "Closed", bg: "bg-gray-100", text: "text-gray-800", icon: CheckCircle2, nextAction: "Archived" },
}

const severityConfig: Record<string, { bg: string; text: string; border: string }> = {
  LOW: { bg: "bg-blue-50", text: "text-blue-700", border: "border-l-4 border-l-blue-400" },
  MEDIUM: { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-l-4 border-l-yellow-400" },
  HIGH: { bg: "bg-orange-50", text: "text-orange-700", border: "border-l-4 border-l-orange-400" },
  CRITICAL: { bg: "bg-red-50", text: "text-red-700", border: "border-l-4 border-l-red-500" },
}

const noticeTypeLabels: Record<string, string> = {
  GST_SCRUTINY: "GST Scrutiny",
  GST_DEMAND: "GST Demand",
  GST_ASSESSMENT: "GST Assessment",
  GST_PENALTY: "GST Penalty",
  GST_REFUND: "GST Refund",
  GST_ARC: "GST ARC",
  INCOME_TAX_SCRUTINY: "IT Scrutiny",
  INCOME_TAX_ASSESSMENT: "IT Assessment",
  INCOME_TAX_DEMAND: "IT Demand",
  INCOME_TAX_PENALTY: "IT Penalty",
  TDS_DEFAULT: "TDS Default",
  ROC_NON_COMPLIANCE: "ROC Non-Compliance",
  EPFO_DEMAND: "EPFO Demand",
  ESIC_DEMAND: "ESIC Demand",
  OTHER: "Other",
}

interface Filters {
  status: string
  severity: string
  noticeType: string
  search: string
}

// Main Page
export default function NoticesPage() {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()
  
  const [notices, setNotices] = useState<Notice[]>([])
  const [stats, setStats] = useState<NoticeStats>({ total: 0, byStatus: {}, bySeverity: {}, overdue: 0, dueThisWeek: 0, highSeverity: 0 })
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<Filters>({ status: "", severity: "", noticeType: "", search: "" })
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) { router.push("/"); return }
    fetchNotices()
  }, [isAuthenticated, router])

  const fetchNotices = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filters.status) params.append('status', filters.status)
      if (filters.severity) params.append('severity', filters.severity)
      if (filters.noticeType) params.append('noticeType', filters.noticeType)
      if (filters.search) params.append('search', filters.search)
      
      const queryString = params.toString()
      const response = await api.get<{ notices: Notice[]; summary: NoticeStats }>(
        `/api/notices${queryString ? `?${queryString}` : ''}`
      )
      setNotices(response.notices || [])
      setStats(response.summary || { total: 0, byStatus: {}, bySeverity: {}, overdue: 0, dueThisWeek: 0, highSeverity: 0 })
    } catch (err) {
      console.error("Failed to fetch notices:", err)
    } finally {
      setLoading(false)
    }
  }

  const filteredNotices = notices.filter(n => {
    if (!filters.search) return true
    const s = filters.search.toLowerCase()
    return (
      n.subject.toLowerCase().includes(s) ||
      n.noticeNumber?.toLowerCase().includes(s) ||
      n.summary?.toLowerCase().includes(s)
    )
  })

  const hasActiveFilters = filters.status || filters.severity || filters.noticeType || filters.search

  const clearFilters = () => setFilters({ status: "", severity: "", noticeType: "", search: "" })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notice Management</h1>
          <p className="text-muted-foreground">Track and manage GST/IT notices and responses</p>
        </div>
        <Button disabled>
          <Plus className="h-4 w-4 mr-2" />
          Add Notice
        </Button>
      </div>

      {/* Stats Cards - Quick Filters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button className="p-4 rounded-lg border bg-card text-left hover:bg-accent/50 transition-colors w-full focus:ring-2 focus:ring-primary focus:outline-none" onClick={() => setFilters({ ...filters, status: "" })}>
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-sm text-muted-foreground">Total Notices</div>
        </button>
        <button className={cn("p-4 rounded-lg border bg-card text-left hover:bg-accent/50 transition-colors w-full focus:ring-2 focus:ring-primary focus:outline-none", stats.overdue > 0 && "border-red-200 bg-red-50/50")} onClick={() => {}}>
          <div className={cn("text-2xl font-bold", stats.overdue > 0 && "text-red-600")}>{stats.overdue}</div>
          <div className="text-sm text-muted-foreground">Overdue</div>
        </button>
        <button className={cn("p-4 rounded-lg border bg-card text-left hover:bg-accent/50 transition-colors w-full focus:ring-2 focus:ring-primary focus:outline-none", stats.dueThisWeek > 0 && "border-orange-200 bg-orange-50/50")}>
          <div className={cn("text-2xl font-bold", stats.dueThisWeek > 0 && "text-orange-600")}>{stats.dueThisWeek}</div>
          <div className="text-sm text-muted-foreground">Due This Week</div>
        </button>
        <button className={cn("p-4 rounded-lg border bg-card text-left hover:bg-accent/50 transition-colors w-full focus:ring-2 focus:ring-primary focus:outline-none", stats.highSeverity > 0 && "border-purple-200 bg-purple-50/50")}>
          <div className={cn("text-2xl font-bold", stats.highSeverity > 0 && "text-purple-600")}>{stats.highSeverity}</div>
          <div className="text-sm text-muted-foreground">High Severity</div>
        </button>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search notices..."
                className="pl-10"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && fetchNotices()}
              />
            </div>
            <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {hasActiveFilters && (
                <span className="ml-2 px-2 py-0.5 bg-primary text-primary-foreground rounded text-xs">
                  {[filters.status, filters.severity, filters.noticeType].filter(Boolean).length}
                </span>
              )}
            </Button>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>

          {showFilters && (
            <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <label className="text-sm font-medium mb-2 block">Status</label>
                <select
                  className="w-full border rounded-lg px-3 py-2 bg-background"
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                >
                  <option value="">All Statuses</option>
                  {Object.keys(statusConfig).map(s => (
                    <option key={s} value={s}>{statusConfig[s].label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Severity</label>
                <select
                  className="w-full border rounded-lg px-3 py-2 bg-background"
                  value={filters.severity}
                  onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
                >
                  <option value="">All Severities</option>
                  <option value="CRITICAL">Critical</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Notice Type</label>
                <select
                  className="w-full border rounded-lg px-3 py-2 bg-background"
                  value={filters.noticeType}
                  onChange={(e) => setFilters({ ...filters, noticeType: e.target.value })}
                >
                  <option value="">All Types</option>
                  {Object.entries(noticeTypeLabels).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notices List - Card Based */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">
          {hasActiveFilters ? `Results (${filteredNotices.length})` : `Notices (${filteredNotices.length})`}
        </h2>
        
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredNotices.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-3" />
              <h3 className="font-medium mb-1">
                {hasActiveFilters ? "No matching notices" : "No notices"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {hasActiveFilters ? "Try adjusting your filters" : "You're all caught up!"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredNotices.map((notice) => {
              const status = statusConfig[notice.status] || statusConfig.RECEIVED
              const severity = severityConfig[notice.severity] || severityConfig.LOW
              const responseDate = notice.responseDueDate ? new Date(notice.responseDueDate) : null
              const now = new Date()
              const daysLeft = responseDate ? Math.ceil((responseDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null
              const isOverdue = daysLeft !== null && daysLeft < 0
              const liability = notice.totalLiability || notice.demandAmount || 0
              const liabilityDisplay = liability > 0 ? `₹${(liability / 100000).toFixed(1)}L` : null

              return (
                <div
                  key={notice.id}
                  className={cn(
                    "p-4 rounded-lg border bg-card hover:shadow-md transition-all cursor-pointer",
                    severity.border
                  )}
                  onClick={() => router.push(`/notices/${notice.id}`)}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn("px-2 py-0.5 rounded text-xs font-semibold uppercase", severity.bg, severity.text)}>
                          {notice.severity}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {noticeTypeLabels[notice.noticeType] || notice.noticeType}
                        </span>
                      </div>
                      <h3 className="font-semibold text-sm mt-1 line-clamp-2">{notice.subject}</h3>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  </div>

                  {/* Financial Impact */}
                  {liabilityDisplay && (
                    <div className={cn(
                      "p-3 rounded-lg mb-3",
                      liability > 10000000 ? "bg-red-50 border border-red-200" : "bg-orange-50 border border-orange-200"
                    )}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Financial Impact</span>
                        <span className={cn("text-lg font-bold", liability > 10000000 ? "text-red-600" : "text-orange-600")}>
                          {liabilityDisplay}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Due Date */}
                  {daysLeft !== null && responseDate && (
                    <div className={cn(
                      "flex items-center justify-between p-2 rounded-md mb-3",
                      isOverdue ? "bg-red-50 text-red-700" : daysLeft <= 7 ? "bg-orange-50 text-orange-700" : "bg-muted/50 text-muted-foreground"
                    )}>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          {isOverdue ? `${Math.abs(daysLeft)}d overdue` : daysLeft === 0 ? "Due today" : `${daysLeft}d left`}
                        </span>
                      </div>
                      <span className="text-xs">{responseDate.toLocaleDateString()}</span>
                    </div>
                  )}

                  {/* Status & Next Action */}
                  <div className="flex items-center justify-between">
                    <span className={cn("px-2 py-0.5 rounded text-xs font-medium", status.bg, status.text)}>
                      {status.label}
                    </span>
                    <div className="flex items-center gap-2 text-xs text-primary">
                      <span className="font-medium">{status.nextAction}</span>
                      <ChevronRight className="h-3 w-3" />
                    </div>
                  </div>

                  {/* Meta */}
                  {notice.workspace && (
                    <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                      {notice.workspace.firm?.name || 'Unknown'} • {notice.workspace.name}
                      {notice.business && ` • ${notice.business.name}`}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}