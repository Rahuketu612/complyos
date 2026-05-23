"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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

const statusConfig: Record<string, { label: string; bg: string; text: string; nextAction: string }> = {
  OPEN: { label: "Open", bg: "bg-blue-100", text: "text-blue-800", nextAction: "Reply" },
  WAITING_CLIENT: { label: "Awaiting", bg: "bg-orange-100", text: "text-orange-800", nextAction: "Follow Up" },
  WAITING_INTERNAL: { label: "In Progress", bg: "bg-yellow-100", text: "text-yellow-800", nextAction: "Review" },
  RESOLVED: { label: "Resolved", bg: "bg-green-100", text: "text-green-800", nextAction: "Done" },
}

const typeConfig: Record<string, { label: string; icon: any; color: string }> = {
  NOTICE: { label: "Notice", icon: AlertTriangle, color: "text-red-600 bg-red-50" },
  TASK: { label: "Task", icon: CheckCircle2, color: "text-blue-600 bg-blue-50" },
  DOCUMENT_REQUEST: { label: "Doc Request", icon: FileQuestion, color: "text-orange-600 bg-orange-50" },
  GENERAL: { label: "General", icon: MessageCircle, color: "text-gray-600 bg-gray-50" },
  APPROVAL: { label: "Approval", icon: FileText, color: "text-purple-600 bg-purple-50" },
}

// Stat Card
function StatCard({ label, value, variant = "default" }: { label: string; value: number; variant?: "default" | "warning" | "success" }) {
  const colors = { default: "text-foreground", warning: "text-orange-600", success: "text-green-600" }
  return (
    <button className="p-4 rounded-lg border bg-card text-left hover:bg-accent/50 transition-colors w-full focus:ring-2 focus:ring-primary focus:outline-none">
      <div className={cn("text-2xl font-bold", colors[variant])}>{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </button>
  )
}

function ThreadCard({ thread, onClick }: { thread: Thread; onClick: () => void }) {
  const status = statusConfig[thread.status] || statusConfig.OPEN
  const type = typeConfig[thread.type] || typeConfig.GENERAL
  const TypeIcon = type.icon
  const isWaitingClient = thread.status === 'WAITING_CLIENT'

  return (
    <div
      onClick={onClick}
      className="p-4 rounded-lg border bg-card hover:shadow-md cursor-pointer transition-all"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn("p-1 rounded", type.color)}>
              <TypeIcon className="h-4 w-4" />
            </span>
            <span className="font-semibold text-sm">{thread.subject}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{thread.workspace.name}</span>
            {thread.business && <span>• {thread.business.name}</span>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={cn("px-2 py-0.5 rounded text-xs font-medium", status.bg, status.text)}>
            {status.label}
          </span>
          {thread.notice && (
            <span className="text-xs text-red-600 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Linked
            </span>
          )}
        </div>
      </div>
      
      {/* Meta row */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>By {thread.creator.firstName}</span>
          <span>•</span>
          <span>{new Date(thread.updatedAt).toLocaleDateString()}</span>
          <span>•</span>
          <span className={cn(isWaitingClient && "text-orange-600 font-medium")}>
            {thread._count.messages} messages
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-primary">
          <span className="font-medium">{status.nextAction}</span>
          <ArrowRight className="h-3 w-3" />
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Messages</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage client communications</p>
        </div>
        <Button onClick={handleCreateThread} className="gap-2">
          <Plus className="h-4 w-4" />
          New Thread
        </Button>
      </div>

      {/* Stats Cards - Quick Filters */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Total" value={stats.total} />
          <StatCard label="Open" value={stats.open} />
          <StatCard label="Awaiting Client" value={stats.waitingClient} variant={stats.waitingClient > 0 ? "warning" : "default"} />
          <StatCard label="Resolved" value={stats.resolved} variant="success" />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search threads..."
            value={filter.search}
            onChange={(e) => setFilter(f => ({ ...f, search: e.target.value }))}
          />
        </div>
        <select
          value={filter.status || ''}
          onChange={(e) => setFilter(f => ({ ...f, status: e.target.value || undefined }))}
          className="border rounded-md px-3 py-2 bg-background focus:ring-2 focus:ring-primary focus:outline-none"
        >
          <option value="">All Status</option>
          <option value="OPEN">Open</option>
          <option value="WAITING_CLIENT">Awaiting Client</option>
          <option value="WAITING_INTERNAL">In Progress</option>
          <option value="RESOLVED">Resolved</option>
        </select>
        <select
          value={filter.type || ''}
          onChange={(e) => setFilter(f => ({ ...f, type: e.target.value || undefined }))}
          className="border rounded-md px-3 py-2 bg-background focus:ring-2 focus:ring-primary focus:outline-none"
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
      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : threads.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-3" />
              <h3 className="font-medium mb-1">No messages</h3>
              <p className="text-sm text-muted-foreground mb-4">Create a thread to start communicating</p>
              <Button variant="outline" onClick={handleCreateThread} className="gap-2">
                <Plus className="h-4 w-4" />
                Create Thread
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
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
    </div>
  )
}