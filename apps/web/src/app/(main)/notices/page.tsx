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

// Status helpers
const statusConfig: Record<string, { label: string; bg: string; text: string; icon: any }> = {
  RECEIVED: { label: "Received", bg: "bg-blue-100", text: "text-blue-800", icon: FileText },
  UNDER_REVIEW: { label: "Under Review", bg: "bg-yellow-100", text: "text-yellow-800", icon: AlertTriangle },
  CLIENT_PENDING: { label: "Client Pending", bg: "bg-orange-100", text: "text-orange-800", icon: Clock },
  DRAFT_PREPARED: { label: "Draft Prepared", bg: "bg-purple-100", text: "text-purple-800", icon: FileText },
  RESPONSE_FILED: { label: "Response Filed", bg: "bg-green-100", text: "text-green-800", icon: CheckCircle2 },
  CLOSED: { label: "Closed", bg: "bg-gray-100", text: "text-gray-800", icon: CheckCircle2 },
}

const severityConfig: Record<string, { bg: string; text: string; border: string }> = {
  LOW: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  MEDIUM: { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200" },
  HIGH: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  CRITICAL: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
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

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="p-4 rounded-lg border border-border bg-card cursor-pointer hover:bg-accent/50" onClick={() => setFilters({ ...filters, status: "" })}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </div>
            <FileText className="h-6 w-6 text-muted-foreground" />
          </div>
        </div>
        <div className="p-4 rounded-lg border border-red-200 bg-red-50/50">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
              <div className="text-sm text-muted-foreground">Overdue</div>
            </div>
            <AlertCircle className="h-6 w-6 text-red-500" />
          </div>
        </div>
        <div className="p-4 rounded-lg border border-orange-200 bg-orange-50/50">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-orange-600">{stats.dueThisWeek}</div>
              <div className="text-sm text-muted-foreground">Due This Week</div>
            </div>
            <Clock className="h-6 w-6 text-orange-500" />
          </div>
        </div>
        <div className="p-4 rounded-lg border border-purple-200 bg-purple-50/50">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-purple-600">{stats.highSeverity}</div>
              <div className="text-sm text-muted-foreground">High/Critical</div>
            </div>
            <AlertTriangle className="h-6 w-6 text-purple-500" />
          </div>
        </div>
        <div className="p-4 rounded-lg border border-green-200 bg-green-50/50">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-green-600">{stats.byStatus?.RESPONSE_FILED || 0}</div>
              <div className="text-sm text-muted-foreground">Filed</div>
            </div>
            <CheckCircle2 className="h-6 w-6 text-green-500" />
          </div>
        </div>
        <div className="p-4 rounded-lg border border-blue-200 bg-blue-50/50">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-blue-600">{stats.byStatus?.UNDER_REVIEW || 0}</div>
              <div className="text-sm text-muted-foreground">In Progress</div>
            </div>
            <RefreshCw className="h-6 w-6 text-blue-500" />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-4 mb-4">
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

      {/* Notices List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            All Notices
            <span className="ml-2 text-sm font-normal text-muted-foreground">({filteredNotices.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredNotices.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium mb-2">
                {hasActiveFilters ? "No notices match your filters" : "No notices yet"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {hasActiveFilters ? "Try adjusting your filters" : "Notices will appear here when added"}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredNotices.map((notice) => {
                const status = statusConfig[notice.status] || statusConfig.RECEIVED
                const severity = severityConfig[notice.severity] || severityConfig.LOW
                const isOverdue = notice.responseDueDate && new Date(notice.responseDueDate) < new Date()
                const StatusIcon = status.icon

                return (
                  <div
                    key={notice.id}
                    className={cn(
                      "p-4 hover:bg-accent/50 transition-colors cursor-pointer border-l-4",
                      severity.border
                    )}
                    onClick={() => router.push(`/notices/${notice.id}`)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <StatusIcon className={cn("h-4 w-4", status.text.replace("text-", "text-"))} />
                          <span className="font-medium text-sm">{notice.subject}</span>
                          {isOverdue && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">
                              OVERDUE
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          {notice.noticeNumber && (
                            <span className="font-mono">{notice.noticeNumber}</span>
                          )}
                          <span>{noticeTypeLabels[notice.noticeType] || notice.noticeType}</span>
                          {notice.assessmentYear && <span>AY: {notice.assessmentYear}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          {notice.totalLiability && notice.totalLiability > 0 ? (
                            <>
                              <div className="text-sm font-semibold">₹{(notice.totalLiability / 100000).toFixed(2)}L</div>
                              <div className="text-xs text-muted-foreground">Liability</div>
                            </>
                          ) : (
                            <div className="text-sm text-muted-foreground">No demand</div>
                          )}
                        </div>
                        {notice.responseDueDate && (
                          <div className={cn(
                            "text-right text-sm",
                            isOverdue ? "text-red-600" : "text-muted-foreground"
                          )}>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Due {new Date(notice.responseDueDate).toLocaleDateString()}
                            </div>
                            {isOverdue && (
                              <div className="text-xs font-medium">
                                {Math.ceil((new Date().getTime() - new Date(notice.responseDueDate).getTime()) / (1000 * 60 * 60 * 24))}d overdue
                              </div>
                            )}
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <span className={cn("px-2 py-0.5 rounded text-xs font-medium", status.bg, status.text)}>
                            {status.label}
                          </span>
                          <span className={cn("px-2 py-0.5 rounded text-xs font-medium uppercase", severity.bg, severity.text)}>
                            {notice.severity}
                          </span>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>
                    {notice.workspace && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        {notice.workspace.firm?.name} / {notice.workspace.name}
                        {notice.business && ` • ${notice.business.name}`}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}