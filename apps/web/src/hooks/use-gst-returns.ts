"use client"

import { useQuery } from "@tanstack/react-query"
import { api, GstReturnListResponse } from "@/lib/api"
import { useAuthStore } from "@/store/auth-store"

export function useGstReturns(params?: { period?: string; status?: string; page?: number; limit?: number }) {
  const selectedBusinessId = useAuthStore((state) => state.selectedBusinessId)

  const queryString = new URLSearchParams()
  if (params?.period) queryString.set("period", params.period)
  if (params?.status) queryString.set("status", params.status)
  if (params?.page) queryString.set("page", String(params.page))
  if (params?.limit) queryString.set("limit", String(params.limit))
  const qs = queryString.toString()

  return useQuery<GstReturnListResponse>({
    queryKey: ["gst", "returns", selectedBusinessId, params],
    queryFn: () => api.get(`/api/gst/${selectedBusinessId}/gst/returns${qs ? `?${qs}` : ""}`),
    staleTime: 30000,
    enabled: !!selectedBusinessId,
  })
}

export function useGstReturnDashboard() {
  const selectedBusinessId = useAuthStore((state) => state.selectedBusinessId)

  return useQuery({
    queryKey: ["gst", "returns", "dashboard", selectedBusinessId],
    queryFn: () => api.get(`/api/gst/${selectedBusinessId}/gst/returns/dashboard`),
    staleTime: 30000,
    enabled: !!selectedBusinessId,
  })
}

// Mock data (demo fallback)
export const mockGstReturns = [
  { id: "1", businessId: "1", formType: "GSTR_1", taxPeriod: "012026", status: "filed", filedDate: "2026-02-05", dueDate: "2026-02-11", totalLiability: 250000, createdAt: "2026-02-05" },
  { id: "2", businessId: "1", formType: "GSTR_3B", taxPeriod: "012026", status: "filed", filedDate: "2026-02-18", dueDate: "2026-02-20", totalLiability: 250000, totalCredit: 150000, createdAt: "2026-02-18" },
  { id: "3", businessId: "1", formType: "GSTR_1", taxPeriod: "022026", status: "pending", dueDate: "2026-03-11", createdAt: "2026-02-28" },
]

export const mockGstReturnSummary = { filed: 12, pending: 2, totalLiability: 3000000 }
