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
  ChevronDown,
  AlertTriangle
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
  PENDING: { bg: "bg-yellow-100", text: "text-yellow-800", icon: Clock, label: "Pending" },
  IN_PROGRESS: { bg: "bg-blue-100", text: "text-blue-800", icon: AlertCircle, label: "In Progress" },
  COMPLETED: { bg: "bg-green-100", text: "text-green-800", icon: CheckCircle2, label: "Completed" },
  CANCELLED: { bg: "bg-gray-100", text: "text-gray-800", icon: X, label: "Cancelled" },
}

const priorityConfig = {
  URGENT: { bg: "bg-red-500", text: "text-white" },
  HIGH: { bg: "bg-orange-500", text: "text-white" },
  MEDIUM: { bg: "bg-yellow-500", text: "text-black" },
  LOW: { bg: "bg-gray-100", text: "text-gray-700" },
}

const complianceTypes = ["GST", "TDS", "PF", "ESI", "ROC", "Income Tax", "Customs", "Other"]

const defaultFilters: TaskFilters = {
  status: "",
  priority: "",
  complianceType: "",
  search: "",
}

// ============ Stat Card ============
function StatCard({ 
  label, 
  value, 
  variant = "default",
  onClick 
}: { 
  label: string; 
  value: number; 
  variant?: "default" | "danger" | "warning" | "success";
  onClick?: () => void
}) {
  const colors = {
    default: "text-foreground",
    danger: "text-red-600",
    warning: "text-orange-600", 
    success: "text-green-600"
  }
  
  return (
    <button
      onClick={onClick}
      className="p-4 rounded-lg border bg-card text-left hover:bg-accent/50 transition-colors w-full focus:ring-2 focus:ring-primary focus:outline-none"
    >
      <div className={cn("text-2xl font-bold", colors[variant])}>{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </button>
  )
}

// ============ Task Card ============
function TaskCard({ 
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
    <div 
      className={cn(
        "p-4 rounded-lg border bg-card transition-all",
        isOverdue ? "border-red-200 bg-red-50/50" : "border-border hover:border-primary/30"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <StatusIcon className={cn("h-4 w-4 flex-shrink-0", status.text)} />
            <span className={cn("px-2 py-0.5 rounded text-xs font-semibold", priority.bg, priority.text)}>
              {task.priority}
            </span>
          </div>
          <h3 className="font-medium text-sm truncate">{task.title}</h3>
          {task.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{task.description}</p>
          )}
          <div className="flex items-center gap-3 mt-2">
            {task.complianceType && (
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                {task.complianceType}
              </span>
            )}
            {task.dueDate && (
              <span className={cn(
                "text-xs flex items-center gap-1",
                isOverdue ? "text-red-600 font-medium" : "text-muted-foreground"
              )}>
                <Calendar className="h-3 w-3" />
                {isOverdue ? `${Math.abs(task.daysOverdue!)}d overdue` : new Date(task.dueDate).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
        <select
          className="text-sm border rounded px-2 py-1 bg-background focus:ring-2 focus:ring-primary focus:outline-none"
          value={task.status}
          onChange={(e) => onStatusChange(task.id, e.target.value)}
        >
          <option value="PENDING">Pending</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
        </select>
      </div>
    </div>
  )
}

// ============ Main Tasks Page ============

export default function TasksPage() {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()
  const { selectedWorkspace } = useWorkspaceStore()
  const [filters, setFilters] = useState<TaskFilters>(defaultFilters)
  const [showFilters, setShowFilters] = useState(false)
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards")

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

  // Sort: overdue first, then by due date
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (a.daysOverdue && a.daysOverdue > 0 && (!b.daysOverdue || b.daysOverdue <= 0)) return -1
    if (b.daysOverdue && b.daysOverdue > 0 && (!a.daysOverdue || a.daysOverdue <= 0)) return 1
    return 0
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

  const setFilter = (key: keyof TaskFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const hasActiveFilters = filters.status || filters.priority || filters.complianceType || filters.search

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Tasks</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {selectedWorkspace ? `${selectedWorkspace.name}` : "Manage compliance tasks"}
          </p>
        </div>
        <Button onClick={() => router.push('/tasks/new')} className="gap-2">
          <Plus className="h-4 w-4" />
          New Task
        </Button>
      </div>

      {/* Stats Row - Quick Filters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Tasks" value={tasks.length} onClick={() => clearFilters()} />
        <StatCard label="Overdue" value={overdueCount} variant={overdueCount > 0 ? "danger" : "default"} onClick={() => setFilters({ ...defaultFilters })} />
        <StatCard label="Pending" value={pendingCount} variant="warning" onClick={() => setFilter("status", "PENDING")} />
        <StatCard label="Completed" value={completedCount} variant="success" onClick={() => setFilter("status", "COMPLETED")} />
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                className="pl-10"
                value={filters.search}
                onChange={(e) => setFilter("search", e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="gap-2"
              >
                <Filter className="h-4 w-4" />
                Filters
                {hasActiveFilters && (
                  <span className="ml-1 px-1.5 py-0.5 bg-primary text-primary-foreground rounded text-xs">
                    {[filters.status, filters.priority, filters.complianceType].filter(Boolean).length}
                  </span>
                )}
              </Button>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
                  <X className="h-3 w-3" />
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg mt-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Status</label>
                <select
                  className="w-full border rounded-md px-3 py-2 bg-background focus:ring-2 focus:ring-primary focus:outline-none"
                  value={filters.status}
                  onChange={(e) => setFilter("status", e.target.value)}
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
                  className="w-full border rounded-md px-3 py-2 bg-background focus:ring-2 focus:ring-primary focus:outline-none"
                  value={filters.priority}
                  onChange={(e) => setFilter("priority", e.target.value)}
                >
                  <option value="">All Priorities</option>
                  <option value="URGENT">Urgent</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Type</label>
                <select
                  className="w-full border rounded-md px-3 py-2 bg-background focus:ring-2 focus:ring-primary focus:outline-none"
                  value={filters.complianceType}
                  onChange={(e) => setFilter("complianceType", e.target.value)}
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

      {/* Tasks List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {hasActiveFilters ? `Results (${sortedTasks.length})` : `Tasks (${sortedTasks.length})`}
          </h2>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : sortedTasks.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-3" />
              <h3 className="font-medium mb-1">
                {hasActiveFilters ? "No matching tasks" : "All caught up!"}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {hasActiveFilters ? "Try adjusting your filters" : "No pending tasks"}
              </p>
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters}>Clear Filters</Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sortedTasks.map(task => (
              <TaskCard key={task.id} task={task} onStatusChange={handleStatusChange} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}