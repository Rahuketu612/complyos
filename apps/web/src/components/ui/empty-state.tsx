"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { LucideIcon, Plus, Upload, MessageSquare, FileText, Bell, AlertCircle } from "lucide-react"

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12 px-4 text-center", className)}>
      {Icon && (
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <Icon className="w-6 h-6 text-slate-400" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-slate-900 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 max-w-sm mb-4">{description}</p>
      {action && (
        <Button onClick={action.onClick} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          {action.label}
        </Button>
      )}
    </div>
  )
}

// Pre-built empty states for common use cases
export function EmptyTasksState({ onCreate }: { onCreate: () => void }) {
  return (
    <EmptyState
      icon={FileText}
      title="No compliance tasks yet"
      description="Create your first compliance task to track deadlines and assign team members."
      action={{ label: "Create First Task", onClick: onCreate }}
    />
  )
}

export function EmptyCommunicationsState({ onCreate }: { onCreate: () => void }) {
  return (
    <EmptyState
      icon={MessageSquare}
      title="No messages yet"
      description="Start a conversation with your client to discuss compliance matters."
      action={{ label: "Start Conversation", onClick: onCreate }}
    />
  )
}

export function EmptyDocumentsState({ onUpload }: { onUpload: () => void }) {
  return (
    <EmptyState
      icon={Upload}
      title="No documents uploaded"
      description="Upload your first document to store it securely in your compliance vault."
      action={{ label: "Upload Document", onClick: onUpload }}
    />
  )
}

export function EmptyNoticesState({ onAdd }: { onAdd: () => void }) {
  return (
    <EmptyState
      icon={AlertCircle}
      title="No GST notices"
      description="Great news! You don't have any pending GST notices. Stay compliant!"
      action={{ label: "Add Notice Manually", onClick: onAdd }}
    />
  )
}

export function EmptyNotificationsState() {
  return (
    <EmptyState
      icon={Bell}
      title="All caught up!"
      description="You don't have any new notifications. We'll notify you when something needs your attention."
    />
  )
}
