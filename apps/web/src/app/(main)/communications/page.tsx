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
  MessageSquare, Plus, Clock, User, AlertTriangle,
  CheckCircle2, FileText, Search, Filter, Inbox,
  ArrowRight, MessageCircle, FileQuestion, Loader2
} from "lucide-react"

interface Thread {
  id: string
  subject: string
  type: string
  status: string
  priority: string
  createdAt: string
  updatedAt: string
  workspace: { id: string; name: string }
  business?: { id: string; name: string }
  creator: { id: string; firstName: string; lastName: string }
  assignee?: { id: string; firstName: string; lastName: string }
  notice?: { id: string; subject: string; severity: string }
  _count: { messages: number }
}

interface Stats {
  total: number
  open: number
  waitingClient: number
  waitingInternal: number
  resolved: number
  pendingEvidence: number
}

const statusConfig: Record<string, { label: string; bg: string; text: string; icon: any }> = {
  OPEN: { label: "Open", bg: "bg-blue-100", text: "text-blue-800", icon: MessageSquare },
  WAITING_CLIENT: { label: "Waiting Client", bg: "bg-orange-100", text: "text-orange-800", icon: Clock },
  WAITING_INTERNAL: { label: "In Progress", bg: "bg-yellow-100", text: "text-yellow-800", icon: User },
  RESOLVED: { label: "Resolved", bg: "bg-green-100", text: "text-green-800", icon: CheckCircle2 },
}

const typeConfig: Record<string, { label: string; icon: any; color: string }> = {
  NOTICE: { label: "Notice", icon: AlertTriangle, color: "text-red-600 bg-red-50" },
  TASK: { label: "Task", icon: CheckCircle2, color: "text-blue-600 bg-blue-50" },
  DOCUMENT_REQUEST: { label: "Doc Request", icon: FileQuestion, color: "text-orange-600 bg-orange-50" },
  GENERAL: { label: "General", icon: MessageCircle, color: "text-gray-600 bg-gray-50" },
  APPROVAL: { label: "Approval", icon: FileText, color: "text-purple-600 bg-purple-50" },
}

function ThreadCard({ thread, onClick }: { thread: Thread; onClick: () => void }) {
  const status = statusConfig[thread.status] || statusConfig.OPEN
  const type = typeConfig[thread.type] || typeConfig.GENERAL
  const TypeIcon = type.icon
  const StatusIcon = status.icon

  return (
    <div
      onClick={onClick}
      className="p-4 border rounded-lg bg-white hover:bg-gray-50 cursor-pointer transition-colors"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn("p-1 rounded", type.color)}>
              <TypeIcon className="h-4 w-4" />
            </span>
            <span className="font-medium truncate">{thread.subject}</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>{thread.workspace.name}</span>
            {thread.business && <span>• {thread.business.name}</span>}
          </div>
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <span>By {thread.creator.firstName} {thread.creator.lastName}</span>
            <span>•</span>
            <span>{new Date(thread.updatedAt).toLocaleDateString()}</span>
            <span>•</span>
            <span>{thread._count.messages} messages</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={cn("px-2 py-1 rounded-lg text-xs font-medium", status.bg, status.text)}>
            <StatusIcon className="h-3 w-3 inline mr-1" />
            {status.label}
          </span>
          {thread.notice && (
            <span className="text-xs text-red-600 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Linked Notice
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default function CommunicationsPage() {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()
  const { selectedWorkspace } = useWorkspaceStore()

  const [threads, setThreads] = useState<Thread[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<{ status?: string; type?: string; search: string }>({
    search: '',
    status: undefined,
    type: undefined,
  })

  useEffect(() => {
    if (!isAuthenticated) { router.push("/"); return }
    fetchData()
  }, [isAuthenticated, router, selectedWorkspace])

  const fetchData = async () => {
    try {
      setLoading(true)
      const queryParts: string[] = []
      if (selectedWorkspace?.id) queryParts.push(`workspaceId=${selectedWorkspace.id}`)
      if (filter.status) queryParts.push(`status=${filter.status}`)
      if (filter.type) queryParts.push(`type=${filter.type}`)
      if (filter.search) queryParts.push(`search=${encodeURIComponent(filter.search)}`)
      const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : ''

      const [threadsRes, statsRes] = await Promise.all([
        api.get<{ threads: Thread[] }>(`/api/communications${queryString}`),
        api.get<Stats>('/api/communications/stats' + (selectedWorkspace?.id ? `?workspaceId=${selectedWorkspace.id}` : '')),
      ])
      setThreads(threadsRes.threads || [])
      setStats(statsRes)
    } catch (err) {
      console.error("Failed to fetch communications:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(fetchData, 300)
    return () => clearTimeout(timer)
  }, [filter, selectedWorkspace])

  const handleCreateThread = () => {
    router.push('/communications/new')
  }

  const handleThreadClick = (threadId: string) => {
    router.push(`/communications/${threadId}`)
  }

  if (loading && !threads.length) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Client Communications</h1>
          <p className="text-muted-foreground">Manage client interactions and requests</p>
        </div>
        <Button onClick={handleCreateThread}>
          <Plus className="h-4 w-4 mr-2" />
          New Thread
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Inbox className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <MessageSquare className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.open}</div>
                <div className="text-xs text-muted-foreground">Open</div>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.waitingClient}</div>
                <div className="text-xs text-muted-foreground">Waiting Client</div>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100">
                <User className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.waitingInternal}</div>
                <div className="text-xs text-muted-foreground">In Progress</div>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.resolved}</div>
                <div className="text-xs text-muted-foreground">Resolved</div>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100">
                <FileQuestion className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.pendingEvidence}</div>
                <div className="text-xs text-muted-foreground">Pending Docs</div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search threads..."
            value={filter.search}
            onChange={(e) => setFilter(f => ({ ...f, search: e.target.value }))}
            className="w-full pl-10 pr-4 py-2 border rounded-lg bg-background"
          />
        </div>
        <select
          value={filter.status || ''}
          onChange={(e) => setFilter(f => ({ ...f, status: e.target.value || undefined }))}
          className="border rounded-lg px-3 py-2 bg-background"
        >
          <option value="">All Status</option>
          <option value="OPEN">Open</option>
          <option value="WAITING_CLIENT">Waiting Client</option>
          <option value="WAITING_INTERNAL">In Progress</option>
          <option value="RESOLVED">Resolved</option>
        </select>
        <select
          value={filter.type || ''}
          onChange={(e) => setFilter(f => ({ ...f, type: e.target.value || undefined }))}
          className="border rounded-lg px-3 py-2 bg-background"
        >
          <option value="">All Types</option>
          <option value="NOTICE">Notice</option>
          <option value="TASK">Task</option>
          <option value="DOCUMENT_REQUEST">Doc Request</option>
          <option value="GENERAL">General</option>
          <option value="APPROVAL">Approval</option>
        </select>
      </div>

      {/* Thread List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : threads.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-gray-50">
          <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <h3 className="font-medium text-gray-900">No communications yet</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Create a thread from a notice or start a new conversation
          </p>
          <Button variant="outline" className="mt-4" onClick={handleCreateThread}>
            <Plus className="h-4 w-4 mr-2" />
            Create Thread
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {threads.map(thread => (
            <ThreadCard
              key={thread.id}
              thread={thread}
              onClick={() => handleThreadClick(thread.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}