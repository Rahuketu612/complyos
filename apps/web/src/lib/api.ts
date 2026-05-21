const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

interface ApiClientOptions extends RequestInit {
  token?: string
}

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

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

export class ApiClient {
  private token: string | null = null

  setToken(token: string | null) {
    this.token = token
  }

  getToken() {
    return this.token
  }

  async login(email: string, password: string) {
    const res = await api.post<{ token: string }>('/api/auth/login', { email, password })
    this.token = res.token
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', res.token)
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