"use client"

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, GstReturn, GstReturnListResponse } from '@/lib/api'

// Cache key
export const GST_RETURNS_KEY = (businessId: string) => ['gst', 'returns', businessId]
export const GST_RETURN_DASHBOARD_KEY = (businessId: string) => ['gst', 'returns', businessId, 'dashboard']

// ============ Hooks ============

export function useGstReturns(
  businessId: string,
  params?: { period?: string; status?: string; page?: number; limit?: number }
) {
  const queryString = new URLSearchParams()
  if (params?.period) queryString.set('period', params.period)
  if (params?.status) queryString.set('status', params.status)
  if (params?.page) queryString.set('page', String(params.page))
  if (params?.limit) queryString.set('limit', String(params.limit))
  const qs = queryString.toString()

  return useQuery<GstReturnListResponse>({
    queryKey: [...GST_RETURNS_KEY(businessId), params],
    queryFn: () => api.get(`/api/gst/${businessId}/gst/returns${qs ? `?${qs}` : ''}`),
    staleTime: 30000,
    enabled: !!businessId,
  })
}

export function useGstReturnDashboard(businessId: string) {
  return useQuery({
    queryKey: GST_RETURN_DASHBOARD_KEY(businessId),
    queryFn: () => api.get(`/api/gst/${businessId}/gst/returns/dashboard`),
    staleTime: 30000,
    enabled: !!businessId,
  })
}

export function useCreateGstReturn() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ businessId, data }: { businessId: string; data: Partial<GstReturn> }) =>
      api.post<GstReturn>(`/api/gst/${businessId}/gst/returns`, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: GST_RETURNS_KEY(variables.businessId) })
    },
  })
}

// ============ Mock Data (Demo Fallback) ============

export const mockGstReturns: GstReturn[] = [
  {
    id: '1',
    businessId: '1',
    formType: 'GSTR_1',
    taxPeriod: '012026',
    status: 'filed',
    filedDate: '2026-02-05',
    dueDate: '2026-02-11',
    totalLiability: 250000,
    createdAt: '2026-02-05T10:00:00Z',
  },
  {
    id: '2',
    businessId: '1',
    formType: 'GSTR_3B',
    taxPeriod: '012026',
    status: 'filed',
    filedDate: '2026-02-18',
    dueDate: '2026-02-20',
    totalLiability: 250000,
    totalCredit: 150000,
    createdAt: '2026-02-18T10:00:00Z',
  },
  {
    id: '3',
    businessId: '1',
    formType: 'GSTR_1',
    taxPeriod: '022026',
    status: 'pending',
    dueDate: '2026-03-11',
    createdAt: '2026-02-28T10:00:00Z',
  },
  {
    id: '4',
    businessId: '1',
    formType: 'GSTR_3B',
    taxPeriod: '022026',
    status: 'pending',
    dueDate: '2026-03-20',
    createdAt: '2026-02-28T10:00:00Z',
  },
]

export const mockGstReturnSummary = {
  filed: 12,
  pending: 2,
  totalLiability: 3000000,
}