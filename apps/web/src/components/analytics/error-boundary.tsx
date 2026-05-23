"use client"

import { Component, ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle, RefreshCw } from "lucide-react"

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: any) => void
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error caught by boundary:', error, errorInfo)
    
    // Log to analytics (will be implemented when API is ready)
    if (typeof window !== 'undefined') {
      // Track error in localStorage for now (syncs to backend via service)
      const errors = JSON.parse(localStorage.getItem('client_errors') || '[]')
      errors.push({
        type: error.name,
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
      })
      localStorage.setItem('client_errors', JSON.stringify(errors.slice(-50))) // Keep last 50
    }

    this.props.onError?.(error, errorInfo)
  }

  handleReload = () => {
    this.setState({ hasError: false })
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              Something went wrong
            </h2>
            <p className="text-slate-500 mb-6">
              We encountered an unexpected error. Please try reloading the page.
            </p>
            {this.state.error && (
              <div className="mb-4 p-3 bg-slate-50 rounded-lg text-left">
                <p className="text-xs text-slate-600 font-mono">
                  {this.state.error.message}
                </p>
              </div>
            )}
            <Button onClick={this.handleReload} className="inline-flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Reload Page
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Hook for manual error logging
export function useErrorTracking() {
  const logError = (error: Error, context?: Record<string, any>) => {
    console.error('Tracked error:', error, context)
    
    if (typeof window !== 'undefined') {
      const errors = JSON.parse(localStorage.getItem('client_errors') || '[]')
      errors.push({
        type: 'tracked_error',
        message: error.message,
        stack: error.stack,
        context,
        timestamp: new Date().toISOString(),
        url: window.location.href,
      })
      localStorage.setItem('client_errors', JSON.stringify(errors.slice(-50)))
    }
  }

  return { logError }
}
