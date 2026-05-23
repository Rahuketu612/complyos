/**
 * CA Service API Hooks
 * Consumes existing ca-service endpoints via API Gateway
 */

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'

// ============ Types ============

export interface Workspace {
  id: string
  name: string
  type: string
  status: string
  memberCount: number
  complianceScore: number
  lastActivity?: string
  createdAt: string
}

export interface Task {
  id: string
  title: string
  description?: string
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  dueDate?: string
  workspaceId: string
  workspaceName?: string
  assigneeName?: string
  complianceType?: string
  daysOverdue?: number
}

export interface DocumentVault {
  id: string
  name: string
  category: string
  retentionDate?: string
  status: string
  uploadedBy?: string
  uploadedAt?: string
  tags?: string[]
}

export interface Notification {
  id: string
  type: 'INFO' | 'WARNING' | 'ALERT' | 'SUCCESS'
  title: string
  message: string
  read: boolean
  createdAt: string
}

export interface AuditStatus {
  integrityStatus: string
  lastAuditTimestamp?: string
  pendingChecks: number
  systemHealth: string
}

export interface CaDashboardData {
  stats: {
    totalWorkspaces: number
    activeWorkspaces: number
    totalTasks: number
    pendingTasks: number
    overdueTasks: number
    completedTasks: number
    totalDocuments: number
    unreadNotifications: number
    msmeAlerts: number
    auditStatus: string
  }
  complianceOverview: {
    score: number
    trend: number
    riskLevel: string
  }
  gstStatus: {
    overdueReturns: number
    pendingReturns: number
    upcomingDueDates: number
  }
  tasksAndDeadlines: {
    pendingTasks: Task[]
    overdueTasks: Task[]
    upcomingDeadlines: Task[]
  }
  clientWorkspaces: Workspace[]
  msmeRiskAlerts: {
    total: number
    amount: number
    vendors: { id: string; name: string; amount: number; dueDays: number }[]
  }
  recentNotices: {
    total: number
    pending: number
    items: { id: string; type: string; dueDate: string; status: string }[]
  }
  documentRetention: {
    expiringCount: number
    alerts: { id: string; name: string; retentionDate: string }[]
  }
  auditIntegrity: AuditStatus
}

// ============ Dashboard Hook ============

export function useCaDashboard() {
  const [data, setData] = useState<CaDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true)
        const response = await api.get<CaDashboardData>('/api/ca/dashboard/widgets')
        setData(response)
        setError(null)
      } catch (err: any) {
        console.error('Dashboard fetch error:', err)
        setError(err.message || 'Failed to load dashboard')
      } finally {
        setLoading(false)
      }
    }

    fetchDashboard()
  }, [])

  return { data, loading, error }
}

// ============ Tasks Hook ============

export interface TaskFilters {
  status?: string
  priority?: string
  workspaceId?: string
  complianceType?: string
  dueBefore?: string
  dueAfter?: string
}

export function useCaTasks(filters?: TaskFilters) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true)
        // Build query params
        const params = new URLSearchParams()
        if (filters?.status) params.append('status', filters.status)
        if (filters?.priority) params.append('priority', filters.priority)
        if (filters?.workspaceId) params.append('workspaceId', filters.workspaceId)
        if (filters?.complianceType) params.append('complianceType', filters.complianceType)
        if (filters?.dueBefore) params.append('dueBefore', filters.dueBefore)
        if (filters?.dueAfter) params.append('dueAfter', filters.dueAfter)

        const queryString = params.toString()
        const endpoint = queryString ? `/api/ca/tasks?${queryString}` : '/api/ca/tasks/my'
        
        const response = await api.get<{ tasks: Task[]; total: number }>(endpoint)
        setTasks(response.tasks || [])
        setError(null)
      } catch (err: any) {
        console.error('Tasks fetch error:', err)
        setError(err.message || 'Failed to load tasks')
      } finally {
        setLoading(false)
      }
    }

    fetchTasks()
  }, [filters?.status, filters?.priority, filters?.workspaceId, filters?.complianceType, filters?.dueBefore, filters?.dueAfter])

  const updateTaskStatus = async (taskId: string, status: string) => {
    try {
      await api.put(`/api/ca/tasks/${taskId}`, { status })
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: status as Task['status'] } : t))
      return true
    } catch (err) {
      console.error('Task update error:', err)
      return false
    }
  }

  return { tasks, loading, error, updateTaskStatus }
}

// ============ Workspaces Hook ============

export function useCaWorkspaces() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        setLoading(true)
        const response = await api.get<{ workspaces: Workspace[]; total: number }>('/api/ca/workspace/workspaces')
        setWorkspaces(response.workspaces || [])
        setError(null)
      } catch (err: any) {
        console.error('Workspaces fetch error:', err)
        setError(err.message || 'Failed to load workspaces')
      } finally {
        setLoading(false)
      }
    }

    fetchWorkspaces()
  }, [])

  return { workspaces, loading, error }
}

// ============ Documents Hook ============

export function useCaDocuments(filters?: { category?: string; workspaceId?: string }) {
  const [documents, setDocuments] = useState<DocumentVault[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setLoading(true)
        const params = new URLSearchParams()
        if (filters?.workspaceId) params.append('workspaceId', filters.workspaceId)
        if (filters?.category) params.append('category', filters.category)

        const queryString = params.toString()
        const endpoint = queryString ? `/api/ca/documents?${queryString}` : '/api/ca/documents/workspace/all'
        
        const response = await api.get<{ documents: DocumentVault[]; total: number }>(endpoint)
        setDocuments(response.documents || [])
        setError(null)
      } catch (err: any) {
        console.error('Documents fetch error:', err)
        setError(err.message || 'Failed to load documents')
      } finally {
        setLoading(false)
      }
    }

    fetchDocuments()
  }, [filters?.category, filters?.workspaceId])

  return { documents, loading, error }
}

// ============ Notifications Hook ============

export function useCaNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setLoading(true)
        const response = await api.get<{ notifications: Notification[]; total: number; unreadCount: number }>('/api/ca/notifications')
        setNotifications(response.notifications || [])
        setError(null)
      } catch (err: any) {
        console.error('Notifications fetch error:', err)
        setError(err.message || 'Failed to load notifications')
      } finally {
        setLoading(false)
      }
    }

    fetchNotifications()
  }, [])

  const markAsRead = async (notificationId?: string) => {
    try {
      if (notificationId) {
        await api.put(`/api/ca/notifications/${notificationId}`, { read: true })
        setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, read: true } : n))
      } else {
        // Mark all as read
        await api.put('/api/ca/notifications', { readAll: true })
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      }
      return true
    } catch (err) {
      console.error('Mark as read error:', err)
      return false
    }
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return { notifications, loading, error, markAsRead, unreadCount }
}

// ============ Workspaces List with Firms ============

export interface Firm {
  id: string
  name: string
  type: string
  memberCount: number
  workspaces: Workspace[]
}

export function useCaFirms() {
  const [firms, setFirms] = useState<Firm[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchFirms = async () => {
      try {
        setLoading(true)
        const response = await api.get<{ firms: Firm[]; total: number }>('/api/ca/workspace/firms')
        setFirms(response.firms || [])
        setError(null)
      } catch (err: any) {
        console.error('Firms fetch error:', err)
        setError(err.message || 'Failed to load firms')
      } finally {
        setLoading(false)
      }
    }

    fetchFirms()
  }, [])

  return { firms, loading, error }
}

// ============ Notices Hook ============

export interface Notice {
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
  penaltyAmount?: number
  totalLiability?: number
  subject: string
  summary?: string
  workspace: { id: string; name: string; firm?: { name: string } }
  business?: { id: string; name: string; pan: string }
  assignee?: { id: string; firstName: string; lastName: string; email: string }
  _count?: { activities: number; linkedDocuments: number; linkedTasks: number }
}

export interface NoticeActivity {
  id: string
  action: string
  comment?: string
  previousValue?: string
  newValue?: string
  createdAt: string
  user: { id: string; firstName: string; lastName: string; email: string }
}

export interface NoticeDetail extends Notice {
  closureDate?: string
  interestAmount?: number
  groundsOfNotice?: string
  resolutionNotes?: string
  assignedAt?: string
  createdAt: string
  updatedAt: string
  activities: NoticeActivity[]
  linkedDocuments: {
    id: string
    documentId: string
    linkedAt: string
    notes?: string
    document: { id: string; fileName: string; fileType: string; category: string }
    linker: { id: string; firstName: string; lastName: string }
  }[]
  linkedTasks: {
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
  }[]
}

export interface NoticeStats {
  total: number
  byStatus: Record<string, number>
  bySeverity: Record<string, number>
  overdue: number
  dueThisWeek: number
  highSeverity: number
}

export function useNotices(filters?: { status?: string; severity?: string; noticeType?: string; search?: string }) {
  const [notices, setNotices] = useState<Notice[]>([])
  const [stats, setStats] = useState<NoticeStats>({ total: 0, byStatus: {}, bySeverity: {}, overdue: 0, dueThisWeek: 0, highSeverity: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchNotices = async () => {
      try {
        setLoading(true)
        const params = new URLSearchParams()
        if (filters?.status) params.append('status', filters.status)
        if (filters?.severity) params.append('severity', filters.severity)
        if (filters?.noticeType) params.append('noticeType', filters.noticeType)
        if (filters?.search) params.append('search', filters.search)
        
        const queryString = params.toString()
        const endpoint = `/api/notices${queryString ? `?${queryString}` : ''}`
        
        const response = await api.get<{ notices: Notice[]; summary: NoticeStats }>(endpoint)
        setNotices(response.notices || [])
        setStats(response.summary || { total: 0, byStatus: {}, bySeverity: {}, overdue: 0, dueThisWeek: 0, highSeverity: 0 })
        setError(null)
      } catch (err: any) {
        console.error('Notices fetch error:', err)
        setError(err.message || 'Failed to load notices')
      } finally {
        setLoading(false)
      }
    }

    fetchNotices()
  }, [filters?.status, filters?.severity, filters?.noticeType, filters?.search])

  return { notices, stats, loading, error }
}

export function useNoticeDetail(noticeId: string) {
  const [notice, setNotice] = useState<NoticeDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchNotice = async () => {
      try {
        setLoading(true)
        const response = await api.get<NoticeDetail>(`/api/notices/${noticeId}`)
        setNotice(response)
        setError(null)
      } catch (err: any) {
        console.error('Notice fetch error:', err)
        setError(err.message || 'Failed to load notice')
      } finally {
        setLoading(false)
      }
    }

    if (noticeId) fetchNotice()
  }, [noticeId])

  const updateStatus = async (status: string) => {
    try {
      await api.put(`/api/notices/${noticeId}`, { status })
      setNotice(prev => prev ? { ...prev, status } : null)
      return true
    } catch (err) {
      console.error('Status update error:', err)
      return false
    }
  }

  const addComment = async (comment: string) => {
    try {
      await api.post(`/api/notices/${noticeId}/comments`, { comment })
      // Refetch to get updated activities
      const response = await api.get<NoticeDetail>(`/api/notices/${noticeId}`)
      setNotice(response)
      return true
    } catch (err) {
      console.error('Comment error:', err)
      return false
    }
  }

  const createTask = async (data: { title: string; description?: string; priority?: string; dueDate?: string }) => {
    try {
      await api.post(`/api/notices/${noticeId}/tasks`, data)
      // Refetch
      const response = await api.get<NoticeDetail>(`/api/notices/${noticeId}`)
      setNotice(response)
      return true
    } catch (err) {
      console.error('Create task error:', err)
      return false
    }
  }

  return { notice, loading, error, updateStatus, addComment, createTask }
}