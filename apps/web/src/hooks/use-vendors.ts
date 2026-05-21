"use client"

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, Vendor, VendorListResponse, VendorDashboard } from '@/lib/api'

// Cache keys
export const VENDORS_KEY = (businessId: string) => ['vendors', businessId]
export const VENDOR_DASHBOARD_KEY = (businessId: string) => ['vendors', businessId, 'dashboard']

// ============ Hooks ============

export function useVendors(
  businessId: string,
  params?: { riskLevel?: string; status?: string; page?: number; limit?: number }
) {
  const queryString = new URLSearchParams()
  if (params?.riskLevel) queryString.set('riskLevel', params.riskLevel)
  if (params?.status) queryString.set('status', params.status)
  if (params?.page) queryString.set('page', String(params.page))
  if (params?.limit) queryString.set('limit', String(params.limit))
  const qs = queryString.toString()

  return useQuery<VendorListResponse>({
    queryKey: [...VENDORS_KEY(businessId), params],
    queryFn: () => api.get(`/api/vendors/${businessId}/vendors${qs ? `?${qs}` : ''}`),
    staleTime: 30000,
    enabled: !!businessId,
  })
}

export function useVendor(businessId: string, vendorId: string) {
  return useQuery<Vendor>({
    queryKey: [...VENDORS_KEY(businessId), vendorId],
    queryFn: () => api.get(`/api/vendors/${businessId}/vendors/${vendorId}`),
    enabled: !!businessId && !!vendorId,
  })
}

export function useVendorDashboard(businessId: string) {
  return useQuery<VendorDashboard>({
    queryKey: VENDOR_DASHBOARD_KEY(businessId),
    queryFn: () => api.get(`/api/vendors/${businessId}/vendors/dashboard`),
    staleTime: 30000,
    enabled: !!businessId,
  })
}

export function useCreateVendor() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ businessId, data }: { businessId: string; data: Partial<Vendor> }) =>
      api.post<Vendor>(`/api/vendors/${businessId}/vendors`, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: VENDORS_KEY(variables.businessId) })
    },
  })
}

export function useRunReconciliation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ businessId, period, books }: { businessId: string; period: string; books?: unknown[] }) =>
      api.post(`/api/vendors/${businessId}/vendors/reconciliation`, { period, books }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: VENDORS_KEY(variables.businessId) })
    },
  })
}

// ============ Mock Data (Demo Fallback) ============

export const mockVendors: Vendor[] = [
  {
    id: '1',
    businessId: '1',
    name: 'ABC Supplies',
    gstin: '27AABCI1234C1Z5',
    pan: 'AABCI1234C',
    state: 'Maharashtra',
    riskLevel: 'low',
    complianceStatus: 'compliant',
    lastGstr1Filed: '2026-01',
    totalItcClaimed: 250000,
    itcAtRisk: 0,
  },
  {
    id: '2',
    businessId: '1',
    name: 'XYZ Materials',
    gstin: '27AAAPX5678C1Z3',
    pan: 'AAPXA5678C',
    state: 'Delhi',
    riskLevel: 'medium',
    complianceStatus: 'compliant',
    lastGstr1Filed: '2025-12',
    totalItcClaimed: 120000,
    itcAtRisk: 12000,
  },
  {
    id: '3',
    businessId: '1',
    name: 'PQR Logistics',
    gstin: '27AAQP9876C1Z1',
    pan: 'AAQP9876C',
    state: 'Karnataka',
    riskLevel: 'high',
    complianceStatus: 'non_filer',
    totalItcClaimed: 80000,
    itcAtRisk: 80000,
  },
]

export const mockVendorSummary = {
  total: 150,
  compliant: 142,
  itcAtRisk: 450000,
  riskBreakdown: {
    low: 120,
    medium: 20,
    high: 8,
    critical: 2,
  },
}