"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useAuthStore } from "@/store/auth-store"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import {
  FileText, AlertTriangle, AlertCircle, CheckCircle2,
  Clock, Calendar, DollarSign, User, Users, Link,
  Send, Plus, ChevronLeft, Loader2, X, Tag,
  Paperclip, CheckSquare, Activity, ArrowRight
} from "lucide-react"

// Types
interface NoticeActivity {
  id: string
  action: string
  comment?: string
  previousValue?: string
  newValue?: string
  createdAt: string
  user: { id: string; firstName: string; lastName: string; email: string }
}

interface LinkedDocument {
  id: string
  documentId: string
  linkedAt: string
  notes?: string
  document: {
    id: string
    fileName: string
    fileType: string
    category: string
  }
  linker: { id: string; firstName: string; lastName: string }
}

interface LinkedTask {
  id: string
  taskId: string
  linkedAt: string
  task: {
    id: string
    title: string
    status: string
    priority: string
    dueDate?: string
    assignee?: { id: string; firstName: string; lastName: string }
  }
  linker: { id: string; firstName: string; lastName: string }
}

interface NoticeDetail {
  id: string
  noticeNumber?: string
  noticeType: string
  issuingAuthority?: string
  assessmentYear?: string
  severity: string
  status: string
  receivedDate: string
  responseDueDate?: string
  closureDate?: string
  demandAmount?: number
  penaltyAmount?: number
  interestAmount?: number
  totalLiability?: number
  subject: string
  summary?: string
  groundsOfNotice?: string
  resolutionNotes?: string
  assignedTo?: string
  assignedAt?: string
  createdAt: string
  updatedAt: string
  workspace: { id: string; name: string; firm?: { name: string } }
  business?: { id: string; name: string; pan: string; gstin?: string }
  assignee?: { id: string; firstName: string; lastName: string; email: string }
  activities: NoticeActivity[]
  linkedDocuments: LinkedDocument[]
  linkedTasks: LinkedTask[]
}

// Status config
const statusConfig: Record<string, { label: string; bg: string; text: string; icon: any }> = {
  RECEIVED: { label: "Received", bg: "bg-blue-100", text: "text-blue-800", icon: FileText },
  UNDER_REVIEW: { label: "Under Review", bg: "bg-yellow-100", text: "text-yellow-800", icon: AlertTriangle },
  CLIENT_PENDING: { label: "Client Pending", bg: "bg-orange-100", text: "text-orange-800", icon: Clock },
  DRAFT_PREPARED: { label: "Draft Prepared", bg: "bg-purple-100", text: "text-purple-800", icon: FileText },
  RESPONSE_FILED: { label: "Response Filed", bg: "bg-green-100", text: "text-green-800", icon: CheckCircle2 },
  CLOSED: { label: "Closed", bg: "bg-gray-100", text: "text-gray-800", icon: CheckCircle2 },
}

const statusOptions = Object.entries(statusConfig).map(([k, v]) => ({ value: k, label: v.label }))

const noticeTypeLabels: Record<string, string> = {
  GST_SCRUTINY: "GST Scrutiny",
  GST_DEMAND: "GST Demand",
  GST_ASSESSMENT: "GST Assessment",
  GST_PENALTY: "GST Penalty",
  INCOME_TAX_SCRUTINY: "IT Scrutiny",
  INCOME_TAX_ASSESSMENT: "IT Assessment",
  INCOME_TAX_DEMAND: "IT Demand",
  OTHER: "Other",
}

const actionLabels: Record<string, string> = {
  CREATED: "Notice Created",
  STATUS_CHANGED: "Status Changed",
  ASSIGNED: "Assigned",
  UNASSIGNED: "Unassigned",
  COMMENT: "Comment",
  DOCUMENT_LINKED: "Document Linked",
  DOCUMENT_UNLINKED: "Document Unlinked",
  TASK_CREATED: "Task Created",
  RESPONSE_FILED: "Response Filed",
  CLOSED: "Closed",
  REOPENED: "Reopened",
  UPDATED: "Updated",
}

const priorityConfig: Record<string, { bg: string; text: string }> = {
  LOW: { bg: "bg-blue-100", text: "text-blue-700" },
  MEDIUM: { bg: "bg-yellow-100", text: "text-yellow-700" },
  HIGH: { bg: "bg-orange-100", text: "text-orange-700" },
  URGENT: { bg: "bg-red-100", text: "text-red-700" },
}

// Timeline item
function TimelineItem({ activity }: { activity: NoticeActivity }) {
  const actionLabel = actionLabels[activity.action] || activity.action
  const isComment = activity.action === 'COMMENT'
  const isStatusChange = activity.action === 'STATUS_CHANGED'

  return (
    <div className="flex gap-3 py-3">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
        <Activity className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{activity.user.firstName} {activity.user.lastName}</span>
          <span className="text-xs text-muted-foreground">{actionLabel}</span>
        </div>
        {isComment && activity.comment && (
          <div className="mt-1 p-3 bg-muted/50 rounded-lg">
            <p className="text-sm whitespace-pre-wrap">{activity.comment}</p>
          </div>
        )}
        {isStatusChange && (
          <div className="mt-1 flex items-center gap-2 text-sm">
            <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700">{activity.previousValue}</span>
            <ArrowRight className="h-3 w-3" />
            <span className="px-2 py-0.5 rounded bg-green-100 text-green-700">{activity.newValue}</span>
          </div>
        )}
        {!isComment && !isStatusChange && activity.comment && (
          <p className="mt-1 text-sm text-muted-foreground">{activity.comment}</p>
        )}
        <div className="mt-1 text-xs text-muted-foreground">
          {new Date(activity.createdAt).toLocaleString()}
        </div>
      </div>
    </div>
  )
}

// Main Page
export default function NoticeDetailPage() {
  const router = useRouter()
  const params = useParams()
  const noticeId = params.id as string
  const { isAuthenticated } = useAuthStore()

  const [notice, setNotice] = useState<NoticeDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [comment, setComment] = useState("")
  const [newStatus, setNewStatus] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState<"timeline" | "documents" | "tasks">("timeline")

  useEffect(() => {
    if (!isAuthenticated) { router.push("/"); return }
    fetchNotice()
  }, [isAuthenticated, router, noticeId])

  const fetchNotice = async () => {
    try {
      setLoading(true)
      const response = await api.get<NoticeDetail>(`/api/notices/${noticeId}`)
      setNotice(response)
      setNewStatus(response.status)
    } catch (err) {
      console.error("Failed to fetch notice:", err)
      router.push("/notices")
    } finally {
      setLoading(false)
    }
  }

  const handleAddComment = async () => {
    if (!comment.trim() || submitting) return
    try {
      setSubmitting(true)
      await api.post(`/api/notices/${noticeId}/comments`, { comment })
      setComment("")
      fetchNotice()
    } catch (err) {
      console.error("Failed to add comment:", err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleStatusChange = async () => {
    if (!newStatus || newStatus === notice?.status || submitting) return
    try {
      setSubmitting(true)
      await api.put(`/api/notices/${noticeId}`, { status: newStatus })
      fetchNotice()
    } catch (err) {
      console.error("Failed to update status:", err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreateTask = async () => {
    try {
      const taskTitle = `Handle: ${notice?.subject.substring(0, 50)}...`
      await api.post(`/api/notices/${noticeId}/tasks`, {
        title: taskTitle,
        description: notice?.summary,
        priority: notice?.severity === 'CRITICAL' ? 'URGENT' : notice?.severity === 'HIGH' ? 'HIGH' : 'MEDIUM',
        dueDate: notice?.responseDueDate,
      })
      fetchNotice()
    } catch (err) {
      console.error("Failed to create task:", err)
    }
  }

  if (loading || !notice) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const status = statusConfig[notice.status] || statusConfig.RECEIVED
  const StatusIcon = status.icon
  const isOverdue = notice.responseDueDate && new Date(notice.responseDueDate) < new Date() && notice.status !== 'CLOSED' && notice.status !== 'RESPONSE_FILED'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" onClick={() => router.push("/notices")}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{notice.subject}</h1>
            <div className="flex items-center gap-3 mt-1">
              {notice.noticeNumber && (
                <span className="font-mono text-sm text-muted-foreground">{notice.noticeNumber}</span>
              )}
              <span className="text-sm text-muted-foreground">
                {noticeTypeLabels[notice.noticeType] || notice.noticeType}
              </span>
              {notice.assessmentYear && (
                <span className="text-sm text-muted-foreground">AY: {notice.assessmentYear}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("px-3 py-1 rounded-lg text-sm font-medium", status.bg, status.text)}>
            <StatusIcon className="h-4 w-4 inline mr-1" />
            {status.label}
          </span>
          <span className={cn(
            "px-3 py-1 rounded-lg text-sm font-medium uppercase",
            notice.severity === 'CRITICAL' ? "bg-red-100 text-red-700" :
            notice.severity === 'HIGH' ? "bg-orange-100 text-orange-700" :
            notice.severity === 'MEDIUM' ? "bg-yellow-100 text-yellow-700" :
            "bg-blue-100 text-blue-700"
          )}>
            {notice.severity}
          </span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Notice Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Notice Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Status Change */}
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-1 block">Update Status</label>
                  <select
                    className="w-full border rounded-lg px-3 py-2 bg-background"
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                  >
                    {statusOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <Button
                  onClick={handleStatusChange}
                  disabled={newStatus === notice.status || submitting}
                  className="mt-6"
                >
                  Update
                </Button>
              </div>

              {/* Key Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground">Received Date</label>
                  <div className="font-medium">{new Date(notice.receivedDate).toLocaleDateString()}</div>
                </div>
                <div className={cn(isOverdue ? "text-red-600" : "")}>
                  <label className="text-xs text-muted-foreground">Response Due</label>
                  <div className="font-medium flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {notice.responseDueDate ? new Date(notice.responseDueDate).toLocaleDateString() : "N/A"}
                    {isOverdue && (
                      <span className="ml-2 text-xs bg-red-100 px-2 py-0.5 rounded">
                        OVERDUE
                      </span>
                    )}
                  </div>
                </div>
                {notice.issuingAuthority && (
                  <div className="col-span-2">
                    <label className="text-xs text-muted-foreground">Issuing Authority</label>
                    <div className="font-medium">{notice.issuingAuthority}</div>
                  </div>
                )}
              </div>

              {/* Financial */}
              {(notice.demandAmount || notice.penaltyAmount || notice.interestAmount) && (
                <div className="p-4 bg-red-50/50 rounded-lg border border-red-200">
                  <label className="text-sm font-medium mb-2 block">Financial Impact</label>
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold">₹{(notice.demandAmount || 0).toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">Demand</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">₹{(notice.penaltyAmount || 0).toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">Penalty</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">₹{(notice.interestAmount || 0).toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">Interest</div>
                    </div>
                    <div className="bg-red-100 rounded-lg p-2">
                      <div className="text-2xl font-bold text-red-700">₹{(notice.totalLiability || 0).toLocaleString()}</div>
                      <div className="text-xs text-red-600">Total</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Summary */}
              {notice.summary && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Summary</label>
                  <p className="text-sm text-muted-foreground">{notice.summary}</p>
                </div>
              )}

              {/* Grounds */}
              {notice.groundsOfNotice && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Grounds of Notice</label>
                  <div className="p-3 bg-muted/50 rounded-lg text-sm whitespace-pre-wrap">
                    {notice.groundsOfNotice}
                  </div>
                </div>
              )}

              {/* Resolution Notes */}
              {notice.resolutionNotes && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Resolution Notes</label>
                  <div className="p-3 bg-green-50/50 rounded-lg border border-green-200 text-sm">
                    {notice.resolutionNotes}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tabs */}
          <Card>
            <CardHeader className="pb-0">
              <div className="flex items-center gap-4 border-b">
                <button
                  onClick={() => setActiveTab("timeline")}
                  className={cn(
                    "px-4 py-2 text-sm font-medium border-b-2 -mb-px",
                    activeTab === "timeline" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  Activity ({notice.activities?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTab("documents")}
                  className={cn(
                    "px-4 py-2 text-sm font-medium border-b-2 -mb-px",
                    activeTab === "documents" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  Documents ({notice.linkedDocuments?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTab("tasks")}
                  className={cn(
                    "px-4 py-2 text-sm font-medium border-b-2 -mb-px",
                    activeTab === "tasks" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  Tasks ({notice.linkedTasks?.length || 0})
                </button>
              </div>
            </CardHeader>
            <CardContent>
              {activeTab === "timeline" && (
                <div className="space-y-4">
                  {/* Add Comment */}
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Add a comment..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      className="flex-1"
                      rows={2}
                    />
                    <Button onClick={handleAddComment} disabled={!comment.trim() || submitting}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Timeline */}
                  <div className="divide-y">
                    {notice.activities?.map((activity) => (
                      <TimelineItem key={activity.id} activity={activity} />
                    ))}
                    {(!notice.activities || notice.activities.length === 0) && (
                      <p className="text-center py-8 text-muted-foreground">No activity yet</p>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "documents" && (
                <div className="space-y-3">
                  {notice.linkedDocuments?.map((link) => (
                    <div key={link.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Paperclip className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <div className="font-medium text-sm">{link.document.fileName}</div>
                          <div className="text-xs text-muted-foreground">
                            Linked by {link.linker.firstName} {link.linker.lastName} • {new Date(link.linkedAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!notice.linkedDocuments || notice.linkedDocuments.length === 0) && (
                    <p className="text-center py-8 text-muted-foreground">No linked documents</p>
                  )}
                </div>
              )}

              {activeTab === "tasks" && (
                <div className="space-y-3">
                  <Button variant="outline" size="sm" onClick={handleCreateTask}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Task from Notice
                  </Button>
                  {notice.linkedTasks?.map((link) => (
                    <div key={link.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <CheckSquare className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <div className="font-medium text-sm">{link.task.title}</div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className={cn(
                              "px-2 py-0.5 rounded",
                              priorityConfig[link.task.priority]?.bg,
                              priorityConfig[link.task.priority]?.text
                            )}>
                              {link.task.priority}
                            </span>
                            {link.task.dueDate && (
                              <span>Due: {new Date(link.task.dueDate).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!notice.linkedTasks || notice.linkedTasks.length === 0) && (
                    <p className="text-center py-8 text-muted-foreground">No linked tasks</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Workspace & Business */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Workspace</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-xs text-muted-foreground">Workspace</div>
                <div className="font-medium">{notice.workspace.name}</div>
                {notice.workspace.firm && (
                  <div className="text-sm text-muted-foreground">{notice.workspace.firm.name}</div>
                )}
              </div>
              {notice.business && (
                <div>
                  <div className="text-xs text-muted-foreground">Business</div>
                  <div className="font-medium">{notice.business.name}</div>
                  <div className="text-sm text-muted-foreground">PAN: {notice.business.pan}</div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Assignment */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Assignment</CardTitle>
            </CardHeader>
            <CardContent>
              {notice.assignee ? (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium">
                      {notice.assignee.firstName} {notice.assignee.lastName}
                    </div>
                    <div className="text-sm text-muted-foreground">{notice.assignee.email}</div>
                    {notice.assignedAt && (
                      <div className="text-xs text-muted-foreground">
                        Assigned: {new Date(notice.assignedAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Not assigned</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-2 bg-muted/50 rounded-lg">
                  <div className="text-lg font-bold">{notice.activities?.length || 0}</div>
                  <div className="text-xs text-muted-foreground">Activities</div>
                </div>
                <div className="p-2 bg-muted/50 rounded-lg">
                  <div className="text-lg font-bold">{notice.linkedDocuments?.length || 0}</div>
                  <div className="text-xs text-muted-foreground">Documents</div>
                </div>
                <div className="p-2 bg-muted/50 rounded-lg">
                  <div className="text-lg font-bold">{notice.linkedTasks?.length || 0}</div>
                  <div className="text-xs text-muted-foreground">Tasks</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Created/Updated */}
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground space-y-1">
                <div>Created: {new Date(notice.createdAt).toLocaleString()}</div>
                <div>Updated: {new Date(notice.updatedAt).toLocaleString()}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}