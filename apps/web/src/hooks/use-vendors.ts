"use client"

import { useQuery } from "@tanstack/react-query"
import { api, VendorListResponse, VendorDashboard } from "@/lib/api"
import { useAuthStore } from "@/store/auth-store"

export function useVendors(params?: { riskLevel?: string; status?: string; page?: number; limit?: number }) {
  const selectedBusinessId = useAuthStore((state) => state.selectedBusinessId)

  const queryString = new URLSearchParams()
  if (params?.riskLevel) queryString.set("riskLevel", params.riskLevel)
  if (params?.status) queryString.set("status", params.status)
  if (params?.page) queryString.set("page", String(params.page))
  if (params?.limit) queryString.set("limit", String(params.limit))
  const qs = queryString.toString()

  return useQuery<VendorListResponse>({
    queryKey: ["vendors", selectedBusinessId, params],
    queryFn: () => api.get(`/api/vendors/${selectedBusinessId}/vendors${qs ? `?${qs}` : ""}`),
    staleTime: 30000,
    enabled: !!selectedBusinessId,
  })
}

export function useVendor(vendorId: string) {
  const selectedBusinessId = useAuthStore((state) => state.selectedBusinessId)
  return useQuery({
    queryKey: ["vendors", selectedBusinessId, vendorId],
    queryFn: () => api.get(`/api/vendors/${selectedBusinessId}/vendors/${vendorId}`),
    enabled: !!selectedBusinessId && !!vendorId,
  })
}

export function useVendorDashboard() {
  const selectedBusinessId = useAuthStore((state) => state.selectedBusinessId)
  return useQuery<VendorDashboard>({
    queryKey: ["vendors", "dashboard", selectedBusinessId],
    queryFn: () => api.get(`/api/vendors/${selectedBusinessId}/vendors/dashboard`),
    staleTime: 30000,
    enabled: !!selectedBusinessId,
  })
}

// Mock data (demo fallback)
export const mockVendors = [
  { id: "1", businessId: "1", name: "ABC Supplies", gstin: "27AABCI1234C1Z5", pan: "AABCI1234C", state: "Maharashtra", riskLevel: "low", complianceStatus: "compliant", lastGstr1Filed: "2026-01", totalItcClaimed: 250000, itcAtRisk: 0 },
  { id: "2", businessId: "1", name: "XYZ Materials", gstin: "27AAAPX5678C1Z3", pan: "AAPXA5678C", state: "Delhi", riskLevel: "medium", complianceStatus: "compliant", lastGstr1Filed: "2025-12", totalItcClaimed: 120000, itcAtRisk: 12000 },
  { id: "3", businessId: "1", name: "PQR Logistics", gstin: "27AAQP9876C1Z1", pan: "AAQP9876C", state: "Karnataka", riskLevel: "high", complianceStatus: "non_filer", totalItcClaimed: 80000, itcAtRisk: 80000 },
]

export const mockVendorSummary = {
  total: 150,
  compliant: 142,
  itcAtRisk: 450000,
  riskBreakdown: { low: 120, medium: 20, high: 8, critical: 2 },
}
