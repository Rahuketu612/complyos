"use client"

import { useQuery } from "@tanstack/react-query"
import { api, GstNoticeListResponse } from "@/lib/api"
import { useAuthStore } from "@/store/auth-store"

export function useGstNotices(params?: { status?: string; type?: string; page?: number; limit?: number }) {
  const selectedBusinessId = useAuthStore((state) => state.selectedBusinessId)

  const queryString = new URLSearchParams()
  if (params?.status) queryString.set("status", params.status)
  if (params?.type) queryString.set("type", params.type)
  if (params?.page) queryString.set("page", String(params.page))
  if (params?.limit) queryString.set("limit", String(params.limit))
  const qs = queryString.toString()

  return useQuery<GstNoticeListResponse>({
    queryKey: ["gst", "notices", selectedBusinessId, params],
    queryFn: () => api.get(`/api/gst/${selectedBusinessId}/gst/notices${qs ? `?${qs}` : ""}`),
    staleTime: 30000,
    enabled: !!selectedBusinessId,
  })
}

export function useGstNotice(id: string) {
  const selectedBusinessId = useAuthStore((state) => state.selectedBusinessId)
  return useQuery({
    queryKey: ["gst", "notices", "detail", id],
    queryFn: () => api.get(`/api/gst/${selectedBusinessId}/gst/notices/${id}`),
    enabled: !!selectedBusinessId && !!id,
  })
}

export function useGstNoticeDashboard() {
  const selectedBusinessId = useAuthStore((state) => state.selectedBusinessId)
  return useQuery({
    queryKey: ["gst", "notices", "dashboard", selectedBusinessId],
    queryFn: () => api.get(`/api/gst/${selectedBusinessId}/gst/notices/dashboard`),
    staleTime: 30000,
    enabled: !!selectedBusinessId,
  })
}

// Mock data (demo fallback)
export const mockGstNotices = [
  { id: "TRN-001", businessId: "1", noticeNumber: "GST-TRN-2026-0042", type: "scrutiny", reason: "ITC mismatch detected", status: "pending", receivedDate: "2026-01-15", dueDate: "2026-01-30", amount: 50000 },
  { id: "TRN-002", businessId: "1", noticeNumber: "GST-DMD-2026-0015", type: "demand", reason: "Short payment of tax", status: "replied", receivedDate: "2026-01-10", dueDate: "2026-01-25", amount: 25000 },
]

export const mockGstNoticeSummary = { total: 15, pending: 3, amount: 120000 }
