"use client"

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, Business, BusinessDashboard, BusinessListResponse } from '@/lib/api'

// Cache key
export const BUSINESSES_KEY = ['businesses']
export const BUSINESS_DASHBOARD_KEY = ['businesses', 'dashboard']

// ============ Hooks ============

export function useBusinesses(params?: { page?: number; limit?: number; search?: string }) {
  const queryString = new URLSearchParams()
  if (params?.page) queryString.set('page', String(params.page))
  if (params?.limit) queryString.set('limit', String(params.limit))
  if (params?.search) queryString.set('search', params.search)
  const qs = queryString.toString()

  return useQuery<BusinessListResponse>({
    queryKey: [...BUSINESSES_KEY, params],
    queryFn: () => api.get(`/api/businesses${qs ? `?${qs}` : ''}`),
    staleTime: 30000, // 30s cache
  })
}

export function useBusiness(id: string) {
  return useQuery<Business>({
    queryKey: [...BUSINESSES_KEY, id],
    queryFn: () => api.get(`/api/businesses/${id}`),
    enabled: !!id,
  })
}

export function useBusinessDashboard(businessId?: string) {
  const qs = businessId ? `?businessId=${businessId}` : ''

  return useQuery<BusinessDashboard>({
    queryKey: [...BUSINESS_DASHBOARD_KEY, businessId],
    queryFn: () => api.get(`/api/businesses/dashboard${qs}`),
  })
}

export function useCreateBusiness() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Partial<Business>) => api.post<Business>('/api/businesses', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BUSINESSES_KEY })
    },
  })
}

export function useUpdateBusiness() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Business> }) =>
      api.patch<Business>(`/api/businesses/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BUSINESSES_KEY })
    },
  })
}

// ============ Mock Data (Demo Fallback) ============

export const mockBusinesses: Business[] = [
  {
    id: '1',
    name: 'ABC Technologies Pvt Ltd',
    pan: 'AABCI1234C',
    gstin: '27AABCI1234C1Z5',
    entityType: 'private_limited',
    state: 'Maharashtra',
    turnover: 5000000,
    employeeCount: 50,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
  {
    id: '2',
    name: 'XYZ Traders',
    pan: 'AAPXA5678C',
    gstin: '27AAAPX5678C1Z3',
    entityType: 'partnership',
    state: 'Delhi',
    turnover: 1200000,
    employeeCount: 10,
    createdAt: '2024-02-20T10:00:00Z',
    updatedAt: '2024-02-20T10:00:00Z',
  },
]

export const mockBusinessDashboard: BusinessDashboard = {
  totalBusinesses: 2,
  complianceScore: 85,
  filingStatus: {
    filed: 12,
    pending: 2,
    overdue: 0,
  },
  upcomingDeadlines: [
    { id: '1', type: 'GSTR-1', dueDate: '2026-02-11', businessId: '1', businessName: 'ABC Technologies' },
    { id: '2', type: 'GSTR-3B', dueDate: '2026-02-20', businessId: '1', businessName: 'ABC Technologies' },
  ],
}