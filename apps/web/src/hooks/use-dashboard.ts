"use client"

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Business, BusinessDashboard } from '@/lib/api'
import { useAuthStore } from '@/store/auth-store'

// Combined dashboard data
export interface DashboardStats {
  complianceScore: number | string
  complianceChange: number
  gstFiled: number | string
  gstChange: number
  noticesPending: number
  noticesChange: number
  itcAtRisk: string
  itcChange: number
  recentActivity: Activity[]
}

export interface Activity {
  id: string
  action: string
  detail: string
  status: "filed" | "pending" | "done" | "verified"
  timestamp: string
}

// Fallback when API unavailable
export const mockDashboardStats: DashboardStats = {
  complianceScore: 85,
  complianceChange: 5,
  gstFiled: "12/12",
  gstChange: 0,
  noticesPending: 2,
  noticesChange: -1,
  itcAtRisk: "₹2.5L",
  itcChange: -12,
  recentActivity: [
    { id: "1", action: "GSTR-3B Filed", detail: "January 2026", status: "filed", timestamp: "2026-02-18" },
    { id: "2", action: "Notice Received", detail: "GST-TRN-2026-0042", status: "pending", timestamp: "2026-01-15" },
    { id: "3", action: "Vendor Payment", detail: "ABC Suppliers", status: "done", timestamp: "2026-01-20" },
    { id: "4", action: "ITC Claimed", detail: "₹1.2 Lakhs", status: "verified", timestamp: "2026-01-25" },
  ],
}

// ============ Dashboard Hook ============

export function useDashboard(businessId?: string) {
  // Try real API first
  const businessQuery = useQuery<BusinessDashboard>({
    queryKey: ["businesses", "dashboard", businessId],
    queryFn: () => api.get(`/api/businesses/dashboard${businessId ? `?businessId=${businessId}` : ""}`),
    staleTime: 30000,
  })

  // Map API response to dashboard format
  if (businessQuery.data) {
    const data = businessQuery.data
    const mapped: DashboardStats = {
      complianceScore: data.complianceScore,
      complianceChange: 0,
      gstFiled: `${data.filingStatus.filed}/${((data.filingStatus.filed || 0) + (data.filingStatus.pending || 0))}`,
      gstChange: 0,
      noticesPending: data.filingStatus.overdue || 0,
      noticesChange: 0,
      itcAtRisk: "₹0",
      itcChange: 0,
      recentActivity: (data.upcomingDeadlines || []).map((d) => ({
        id: d.id,
        action: `${d.type} Due`,
        detail: d.businessName,
        status: "pending" as const,
        timestamp: d.dueDate,
      })),
    }
    return {
      ...businessQuery,
      data: mapped,
    }
  }

  // Return mock data on error or no data
  return {
    data: mockDashboardStats,
    isLoading: businessQuery.isLoading,
    isError: businessQuery.isError,
  }
}
