"use client"

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, GstNotice, GstNoticeListResponse } from '@/lib/api'

// Cache keys
export const GST_NOTICES_KEY = (businessId: string) => ['gst', 'notices', businessId]
export const GST_NOTICE_DASHBOARD_KEY = (businessId: string) => ['gst', 'notices', businessId, 'dashboard']

// ============ Hooks ============

export function useGstNotices(
  businessId: string,
  params?: { status?: string; type?: string; page?: number; limit?: number }
) {
  const queryString = new URLSearchParams()
  if (params?.status) queryString.set('status', params.status)
  if (params?.type) queryString.set('type', params.type)
  if (params?.page) queryString.set('page', String(params.page))
  if (params?.limit) queryString.set('limit', String(params.limit))
  const qs = queryString.toString()

  return useQuery<GstNoticeListResponse>({
    queryKey: [...GST_NOTICES_KEY(businessId), params],
    queryFn: () => api.get(`/api/gst/${businessId}/gst/notices${qs ? `?${qs}` : ''}`),
    staleTime: 30000,
    enabled: !!businessId,
  })
}

export function useGstNotice(id: string) {
  return useQuery<GstNotice>({
    queryKey: ['gst', 'notices', 'detail', id],
    queryFn: () => api.get(`/api/gst/1/gst/notices/${id}`),
    enabled: !!id,
  })
}

export function useGstNoticeDashboard(businessId: string) {
  return useQuery({
    queryKey: GST_NOTICE_DASHBOARD_KEY(businessId),
    queryFn: () => api.get(`/api/gst/${businessId}/gst/notices/dashboard`),
    staleTime: 30000,
    enabled: !!businessId,
  })
}

export function useUpdateNoticeStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/api/gst/1/gst/notices/${id}/status`, { status }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: GST_NOTICES_KEY('1') })
    },
  })
}

// ============ Mock Data (Demo Fallback) ============

export const mockGstNotices: GstNotice[] = [
  {
    id: 'TRN-001',
    businessId: '1',
    noticeNumber: 'GST-TRN-2026-0042',
    type: 'scrutiny',
    reason: 'ITC mismatch detected between GSTR-3B and GSTR-2A',
    status: 'pending',
    receivedDate: '2026-01-15',
    dueDate: '2026-01-30',
    amount: 50000,
    summary: 'Automated scrutiny notice regarding ITC claimed on inward supplies',
  },
  {
    id: 'TRN-002',
    businessId: '1',
    noticeNumber: 'GST-DMD-2026-0015',
    type: 'demand',
    reason: 'Short payment of tax',
    status: 'replied',
    receivedDate: '2026-01-10',
    dueDate: '2026-01-25',
    amount: 25000,
  },
]

export const mockGstNoticeSummary = {
  total: 15,
  pending: 3,
  amount: 120000,
}