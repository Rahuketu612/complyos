"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuthStore } from "@/store/auth-store"
import { useWorkspaceStore } from "@/stores/workspace-store"
import { useCaTasks, Task } from "@/hooks/use-ca-service"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Filter,
  Search,
  Plus,
  X,
  Loader2,
  Calendar,
  ChevronDown
} from "lucide-react"

// ============ Filter Types ============

interface TaskFilters {
  status: string
  priority: string
  complianceType: string
  search: string
}

// ============ Status Config ============

const statusConfig = {
  PENDING: { bg: "bg-yellow-100", text: "text-yellow-800", icon: Clock },
  IN_PROGRESS: { bg: "bg-blue-100", text: "text-blue-800", icon: AlertCircle },
  COMPLETED: { bg: "bg-green-100", text: "text-green-800", icon: CheckCircle2 },
  CANCELLED: { bg: "bg-gray-100", text: "text-gray-800", icon: X },
}

const priorityConfig = {
  URGENT: { bg: "bg-red-100", text: "text-red-700" },
  HIGH: { bg: "bg-orange-100", text: "text-orange-700" },
  MEDIUM: { bg: "bg-yellow-100", text: "text-yellow-700" },
  LOW: { bg: "bg-blue-100", text: "text-blue-700" },
}

const complianceTypes = [
  "GST",
  "TDS",
  "PF",
  "ESI",
  "ROC",
  "Income Tax",
  "Customs",
  "Other"
]

const defaultFilters: TaskFilters = {
  status: "",
  priority: "",
  complianceType: "",
  search: "",
}

// ============ Task Row ============

function TaskRow({ 
  task, 
  onStatusChange 
}: { 
  task: Task
  onStatusChange: (id: string, status: string) => void 
}) {
  const status = statusConfig[task.status as keyof typeof statusConfig] || statusConfig.PENDING
  const priority = priorityConfig[task.priority as keyof typeof priorityConfig] || priorityConfig.MEDIUM
  const StatusIcon = status.icon
  const isOverdue = task.daysOverdue && task.daysOverdue > 0

  return (
    <tr className="border-b hover:bg-muted/50">
      <td className="p-3">
        <div className="flex items-center gap-2">
          <StatusIcon className={cn("h-4 w-4", status.text.replace("text-", "text-"))} />
          <span className="font-medium text-sm">{task.title}</span>
        </div>
        {task.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{task.description}</p>
        )}
      </td>
      <td className="p-3">
        <span className={cn("px-2 py-1 rounded text-xs font-medium", priority.bg, priority.text)}>
          {task.priority}
        </span>
      </td>
      <td className="p-3">
        {task.complianceType && (
          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
            {task.complianceType}
          </span>
        )}
      </td>
      <td className="p-3">
        {task.dueDate && (
          <div className={cn("flex items-center gap-1 text-sm", isOverdue ? "text-red-600" : "text-muted-foreground")}>
            <Calendar className="h-3 w-3" />
            {isOverdue ? (
              <span className="font-medium">{Math.abs(task.daysOverdue!)}d overdue</span>
            ) : (
              new Date(task.dueDate).toLocaleDateString()
            )}
          </div>
        )}
      </td>
      <td className="p-3">
        {task.workspaceName && (
          <span className="text-xs text-muted-foreground">{task.workspaceName}</span>
        )}
      </td>
      <td className="p-3">
        <select
          className="text-sm border rounded px-2 py-1 bg-background"
          value={task.status}
          onChange={(e) => onStatusChange(task.id, e.target.value)}
        >
          <option value="PENDING">Pending</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
        </select>
      </td>
    </tr>
  )
}

// ============ Main Tasks Page ============

export default function TasksPage() {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()
  const { selectedWorkspace } = useWorkspaceStore()
  const [filters, setFilters] = useState<TaskFilters>(defaultFilters)
  const [showFilters, setShowFilters] = useState(false)

  // Build query filters
  const queryFilters = {
    status: filters.status || undefined,
    priority: filters.priority || undefined,
    complianceType: filters.complianceType || undefined,
  }

  const { tasks, loading, error, updateTaskStatus } = useCaTasks(queryFilters)

  // Filter tasks by search
  const filteredTasks = tasks.filter(task => {
    if (!filters.search) return true
    const search = filters.search.toLowerCase()
    return (
      task.title.toLowerCase().includes(search) ||
      task.description?.toLowerCase().includes(search) ||
      task.complianceType?.toLowerCase().includes(search)
    )
  })

  // Group counts
  const overdueCount = tasks.filter(t => t.daysOverdue && t.daysOverdue > 0).length
  const pendingCount = tasks.filter(t => t.status === "PENDING").length
  const completedCount = tasks.filter(t => t.status === "COMPLETED").length

  const handleStatusChange = async (taskId: string, status: string) => {
    await updateTaskStatus(taskId, status)
  }

  const clearFilters = () => {
    setFilters(defaultFilters)
  }

  const hasActiveFilters = filters.status || filters.priority || filters.complianceType || filters.search

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tasks</h1>
          <p className="text-muted-foreground">
            {selectedWorkspace ? `Workspace: ${selectedWorkspace.name}` : "Manage compliance tasks"}
          </p>
        </div>
        <Button onClick={() => router.push('/tasks/new')}>
          <Plus className="h-4 w-4 mr-2" />
          New Task
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 rounded-lg border border-border bg-card cursor-pointer hover:bg-accent/50" onClick={() => setFilters({ ...defaultFilters, status: "" })}>
          <div className="text-2xl font-bold">{tasks.length}</div>
          <div className="text-sm text-muted-foreground">Total Tasks</div>
        </div>
        <div className="p-4 rounded-lg border border-border bg-card cursor-pointer hover:bg-accent/50" onClick={() => setFilters({ ...defaultFilters })}>
          <div className="text-2xl font-bold text-red-600">{overdueCount}</div>
          <div className="text-sm text-muted-foreground">Overdue</div>
        </div>
        <div className="p-4 rounded-lg border border-border bg-card cursor-pointer hover:bg-accent/50" onClick={() => setFilters({ ...defaultFilters, status: "PENDING" })}>
          <div className="text-2xl font-bold text-orange-600">{pendingCount}</div>
          <div className="text-sm text-muted-foreground">Pending</div>
        </div>
        <div className="p-4 rounded-lg border border-border bg-card cursor-pointer hover:bg-accent/50" onClick={() => setFilters({ ...defaultFilters, status: "COMPLETED" })}>
          <div className="text-2xl font-bold text-green-600">{completedCount}</div>
          <div className="text-sm text-muted-foreground">Completed</div>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                className="pl-10"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {hasActiveFilters && (
                <span className="ml-2 px-2 py-0.5 bg-primary text-primary-foreground rounded text-xs">
                  {[filters.status, filters.priority, filters.complianceType].filter(Boolean).length}
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

          {/* Filter Panel */}
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
                  <option value="PENDING">Pending</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Priority</label>
                <select
                  className="w-full border rounded-lg px-3 py-2 bg-background"
                  value={filters.priority}
                  onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                >
                  <option value="">All Priorities</option>
                  <option value="URGENT">Urgent</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Compliance Type</label>
                <select
                  className="w-full border rounded-lg px-3 py-2 bg-background"
                  value={filters.complianceType}
                  onChange={(e) => setFilters({ ...filters, complianceType: e.target.value })}
                >
                  <option value="">All Types</option>
                  {complianceTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tasks Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {hasActiveFilters ? `Filtered Tasks (${filteredTasks.length})` : `All Tasks (${filteredTasks.length})`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium mb-2">
                {hasActiveFilters ? "No tasks match your filters" : "No tasks yet"}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {hasActiveFilters ? "Try adjusting your filters" : "Create your first task to get started"}
              </p>
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters}>Clear Filters</Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium">Task</th>
                    <th className="text-left p-3 font-medium">Priority</th>
                    <th className="text-left p-3 font-medium">Type</th>
                    <th className="text-left p-3 font-medium">Due Date</th>
                    <th className="text-left p-3 font-medium">Workspace</th>
                    <th className="text-left p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.map(task => (
                    <TaskRow key={task.id} task={task} onStatusChange={handleStatusChange} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}