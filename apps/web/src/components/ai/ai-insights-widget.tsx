"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"
import { Loader2, Lightbulb, AlertTriangle, AlertCircle, CheckCircle2, RefreshCw, Brain } from "lucide-react"

// Types
interface AIInsight {
  type: string
  message: string
  priority: string
}

interface AIStatus {
  enabled: boolean
  provider: string
  features: {
    noticeSummarization: boolean
    taskSuggestions: boolean
    dashboardInsights: boolean
    documentTagging: boolean
  }
}

// AI Insights Widget
export function AIInsightsWidget({ className }: { className?: string }) {
  const [insights, setInsights] = useState<AIInsight[]>([])
  const [loading, setLoading] = useState(true)
  const [aiStatus, setAIStatus] = useState<AIStatus | null>(null)
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)

  useEffect(() => {
    fetchAIStatus()
    fetchInsights()
  }, [])

  const fetchAIStatus = async () => {
    try {
      const response = await api.get<AIStatus>('/api/ai/status')
      setAIStatus(response)
    } catch (err) {
      console.error('AI status error:', err)
    }
  }

  const fetchInsights = async () => {
    try {
      setLoading(true)
      const response = await api.get<{ success: boolean; data: { insights: AIInsight[]; summary: string }; isMock?: boolean }>('/api/ai/dashboard/insights')
      if (response.success && response.data?.insights) {
        setInsights(response.data.insights)
      }
      setLastRefreshed(new Date())
    } catch (err) {
      console.error('AI insights error:', err)
    } finally {
      setLoading(false)
    }
  }

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'OVERDUE_RISK': return AlertCircle
      case 'MISSING_FILING': return AlertTriangle
      case 'NOTICE_PATTERN': return CheckCircle2
      case 'MSME_EXPOSURE': return AlertTriangle
      case 'COMPLIANCE_GAP': return AlertCircle
      default: return Lightbulb
    }
  }

  const getInsightColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'text-red-600 bg-red-50 border-red-200'
      case 'MEDIUM': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'LOW': return 'text-blue-600 bg-blue-50 border-blue-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  if (!aiStatus?.enabled) {
    return (
      <div className={cn("border rounded-lg p-4 bg-gray-50/50", className)}>
        <div className="flex items-center gap-2 mb-3">
          <Brain className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-medium">AI Insights</h3>
        </div>
        <div className="text-sm text-muted-foreground">
          AI features are disabled. Enable via <code className="bg-muted px-1 rounded">ENABLE_AI_FEATURES=true</code> to get insights.
        </div>
      </div>
    )
  }

  return (
    <div className={cn("border rounded-lg p-4 bg-gradient-to-br from-purple-50/50 to-blue-50/50", className)}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-100">
            <Brain className="h-4 w-4 text-purple-600" />
          </div>
          <h3 className="font-medium">AI Insights</h3>
          {aiStatus.provider && (
            <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded">
              {aiStatus.provider}
            </span>
          )}
        </div>
        <button
          onClick={fetchInsights}
          disabled={loading}
          className="p-1 rounded hover:bg-purple-100 transition-colors"
          title="Refresh insights"
        >
          <RefreshCw className={cn("h-4 w-4 text-purple-600", loading && "animate-spin")} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
        </div>
      ) : insights.length === 0 ? (
        <div className="text-center py-4">
          <Lightbulb className="h-8 w-8 text-purple-300 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No insights available yet</p>
          <p className="text-xs text-muted-foreground mt-1">AI will analyze your compliance data</p>
        </div>
      ) : (
        <div className="space-y-2">
          {insights.map((insight, i) => {
            const Icon = getInsightIcon(insight.type)
            const colorClass = getInsightColor(insight.priority)

            return (
              <div
                key={i}
                className={cn(
                  "flex items-start gap-2 p-2 rounded-lg border",
                  colorClass
                )}
              >
                <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{insight.message}</p>
                  <span className="text-xs opacity-75 uppercase">{insight.type.replace('_', ' ')}</span>
                </div>
              </div>
            )
          })}

          {lastRefreshed && (
            <div className="text-xs text-muted-foreground text-right pt-2">
              Updated {lastRefreshed.toLocaleTimeString()}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// AI Loading Indicator
export function AILoadingSpinner({ message = "Analyzing..." }: { message?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-purple-600">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span>{message}</span>
    </div>
  )
}

// AI Button with loading state
interface AIButtonProps {
  onClick: () => Promise<any>
  children: React.ReactNode
  className?: string
  variant?: "default" | "outline"
}

export function AIButton({ onClick, children, className, variant = "outline" }: AIButtonProps) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const handleClick = async () => {
    setLoading(true)
    try {
      const data = await onClick()
      setResult(data)
      return data
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={className}>
      <button
        onClick={handleClick}
        disabled={loading}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
          "bg-purple-100 text-purple-700 hover:bg-purple-200",
          loading && "opacity-50 cursor-not-allowed"
        )}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Brain className="h-4 w-4" />
            {children}
          </>
        )}
      </button>
    </div>
  )
}