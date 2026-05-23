"use client"

import { cn } from "@/lib/utils"
import { Loader2, FileText, MessageSquare, Bell } from "lucide-react"

// Loading spinner with optional message
interface LoadingSpinnerProps {
  message?: string
  className?: string
}

export function LoadingSpinner({ message = "Loading...", className }: LoadingSpinnerProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12 gap-3", className)}>
      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  )
}

// Skeleton loading for content placeholders
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse bg-slate-100 rounded-lg", className)} />
  )
}

// Skeleton list items
export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3">
          <div className="w-10 h-10 bg-slate-100 rounded-full animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-slate-100 rounded w-3/4 animate-pulse" />
            <div className="h-3 bg-slate-100 rounded w-1/2 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  )
}

// Full page loading
export function PageLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-slate-900">Loading COMPLYOS...</h2>
        <p className="text-sm text-slate-500 mt-1">Preparing your compliance dashboard</p>
      </div>
    </div>
  )
}

// Card loading state
export function CardSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="h-5 bg-slate-100 rounded w-32 animate-pulse" />
        <div className="w-8 h-8 bg-slate-100 rounded animate-pulse" />
      </div>
      <div className="space-y-2">
        <div className="h-8 bg-slate-100 rounded animate-pulse" />
        <div className="h-4 bg-slate-100 rounded w-3/4 animate-pulse" />
      </div>
    </div>
  )
}

// Table loading state
export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex gap-4 p-3 border-b">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-4 bg-slate-100 rounded animate-pulse flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 p-3">
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className="h-4 bg-slate-50 rounded animate-pulse flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}
