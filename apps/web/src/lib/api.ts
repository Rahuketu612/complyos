/**
 * COMPLYOS API Client
 * Communicates with backend via API Gateway (:3000)
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

// ============ Types ============

export interface ApiClientOptions extends RequestInit {
  token?: string
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

// ============ Core Client ============

async function client<T>(endpoint: string, options?: ApiClientOptions): Promise<T> {
  const { token, ...fetchOptions } = options || {}
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...fetchOptions.headers,
  }

  if (token) {
    ;(headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }))
    throw new ApiError(response.status, error.message)
  }

  return response.json()
}

// ============ Base API Methods ============

export const api = {
  get: <T>(endpoint: string, options?: ApiClientOptions) =>
    client<T>(endpoint, { ...options, method: 'GET' }),
    
  post: <T>(endpoint: string, data?: unknown, options?: ApiClientOptions) =>
    client<T>(endpoint, { ...options, method: 'POST', body: JSON.stringify(data) }),
    
  put: <T>(endpoint: string, data?: unknown, options?: ApiClientOptions) =>
    client<T>(endpoint, { ...options, method: 'PUT', body: JSON.stringify(data) }),
    
  patch: <T>(endpoint: string, data?: unknown, options?: ApiClientOptions) =>
    client<T>(endpoint, { ...options, method: 'PATCH', body: JSON.stringify(data) }),
    
  delete: <T>(endpoint: string, options?: ApiClientOptions) =>
    client<T>(endpoint, { ...options, method: 'DELETE' }),
}

// ============ Data Types ============

// Auth
export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  accessToken: string
  refreshToken?: string
  user: {
    id: string
    email: string
    firstName: string
    lastName?: string
  }
}

export interface RegisterRequest {
  organizationName: string
  email: string
  password: string
  firstName: string
  lastName?: string
}

// Business
export interface Business {
  id: string
  name: string
  pan?: string
  gstin?: string
  tan?: string
  entityType: string
  constitution?: string
  state?: string
  turnover?: number
  employeeCount?: number
  createdAt: string
  updatedAt: string
}

export interface BusinessListResponse {
  businesses: Business[]
  total: number
  page: number
  limit: number
}

export interface BusinessDashboard {
  totalBusinesses: number
  complianceScore: number
  filingStatus: {
    filed: number
    pending: number
    overdue: number
  }
  upcomingDeadlines: Deadline[]
}

export interface Deadline {
  id: string
  type: string
  dueDate: string
  businessId: string
  businessName: string
}

// GST Returns
export interface GstReturn {
  id: string
  businessId: string
  formType: 'GSTR_1' | 'GSTR_2A' | 'GSTR_2B' | 'GSTR_3B' | 'ANNUAL'
  taxPeriod: string
  status: 'pending' | 'filed' | 'accepted' | 'rejected'
  filedDate?: string
  dueDate: string
  totalLiability?: number
  totalCredit?: number
  createdAt: string
}

export interface GstReturnListResponse {
  returns: GstReturn[]
  total: number
  summary: {
    filed: number
    pending: number
    totalLiability: number
  }
}

// GST Notices
export interface GstNotice {
  id: string
  businessId: string
  noticeNumber?: string
  type: 'scrutiny' | 'demand' | 'assessment' | 'refund' | 'penalty' | 'others'
  reason?: string
  status: 'pending' | 'replied' | 'acknowledged' | 'closed'
  receivedDate: string
  dueDate: string
  amount?: number
  summary?: string
}

export interface GstNoticeListResponse {
  notices: GstNotice[]
  total: number
  summary: {
    total: number
    pending: number
    amount: number
  }
}

// Vendor
export interface Vendor {
  id: string
  businessId: string
  name: string
  gstin?: string
  pan?: string
  state?: string
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  complianceStatus: 'compliant' | 'irregular' | 'non_filer'
  lastGstr1Filed?: string
  totalItcClaimed?: number
  itcAtRisk?: number
}

export interface VendorListResponse {
  vendors: Vendor[]
  total: number
  summary: {
    total: number
    compliant: number
    itcAtRisk: number
    riskBreakdown: {
      low: number
      medium: number
      high: number
      critical: number
    }
  }
}

export interface VendorDashboard {
  totalVendors: number
  compliantVendors: number
  vendorsNeedingAttention: Vendor[]
  itcExposure: number
  riskTrends: TrendData[]
}

export interface TrendData {
  period: string
  value: number
}

// ============ Authenticated Client ============

export class ApiClient {
  private token: string | null = null

  setToken(token: string | null) {
    this.token = token
  }

  getToken() {
    return this.token
  }

  async login(email: string, password: string) {
    const res = await api.post<LoginResponse>('/api/auth/login', { email, password })
    this.token = res.accessToken
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', res.accessToken)
    }
    return res
  }

  logout() {
    this.token = null
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token')
    }
  }

  async get<T>(endpoint: string) {
    return api.get<T>(endpoint, { token: this.token || undefined })
  }

  async post<T>(endpoint: string, data?: unknown) {
    return api.post<T>(endpoint, data, { token: this.token || undefined })
  }

  async put<T>(endpoint: string, data?: unknown) {
    return api.put<T>(endpoint, data, { token: this.token || undefined })
  }

  async delete<T>(endpoint: string) {
    return api.delete<T>(endpoint, { token: this.token || undefined })
  }
}

export const apiClient = new ApiClient()

export class ApiClientError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ApiClientError'
  }
}