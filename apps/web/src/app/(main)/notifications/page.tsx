"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuthStore } from "@/store/auth-store"
import { useCaNotifications, Notification } from "@/hooks/use-ca-service"
import { cn } from "@/lib/utils"
import {
  Bell,
  BellOff,
  CheckCheck,
  Check,
  Loader2,
  Info,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Filter,
  X,
  ChevronRight
} from "lucide-react"

// ============ Severity Config ============

const severityConfig: Record<string, { bg: string; text: string; border: string; icon: any }> = {
  INFO: { 
    bg: "bg-blue-50", 
    text: "text-blue-800", 
    border: "border-blue-200",
    icon: Info 
  },
  WARNING: { 
    bg: "bg-yellow-50", 
    text: "text-yellow-800", 
    border: "border-yellow-200",
    icon: AlertTriangle 
  },
  ALERT: { 
    bg: "bg-red-50", 
    text: "text-red-800", 
    border: "border-red-200",
    icon: AlertCircle 
  },
  SUCCESS: { 
    bg: "bg-green-50", 
    text: "text-green-800", 
    border: "border-green-200",
    icon: CheckCircle2 
  },
}

// ============ Notification Row ============

function NotificationRow({ 
  notification, 
  onMarkAsRead 
}: { 
  notification: Notification
  onMarkAsRead: (id: string) => void 
}) {
  const config = severityConfig[notification.type] || severityConfig.INFO
  const SeverityIcon = config.icon
  const isUnread = !notification.read

  return (
    <div 
      className={cn(
        "flex items-start gap-4 p-4 border-b transition-colors",
        config.bg,
        isUnread && "font-medium",
        !isUnread && "opacity-75"
      )}
    >
      <div className={cn(
        "p-2 rounded-lg",
        config.bg.replace("-50", "-100")
      )}>
        <SeverityIcon className={cn("h-5 w-5", config.text)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h4 className="font-medium text-sm">{notification.title}</h4>
          <span className="text-xs text-muted-foreground">
            {new Date(notification.createdAt).toLocaleString()}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">{notification.message}</p>
        <div className="flex items-center gap-2 mt-2">
          <span className={cn(
            "px-2 py-0.5 rounded text-xs font-medium",
            config.bg,
            config.text
          )}>
            {notification.type}
          </span>
          {isUnread && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 text-xs"
              onClick={() => onMarkAsRead(notification.id)}
            >
              <Check className="h-3 w-3 mr-1" />
              Mark as read
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// ============ Main Notifications Page ============

export default function NotificationsPage() {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()
  const [filter, setFilter] = useState<string>("all")
  const { notifications, loading, error, markAsRead, unreadCount } = useCaNotifications()

  // Filter notifications
  const filteredNotifications = notifications.filter(n => {
    if (filter === "unread") return !n.read
    if (filter === "read") return n.read
    return true
  })

  const handleMarkAsRead = async (id: string) => {
    await markAsRead(id)
  }

  const handleMarkAllRead = async () => {
    await markAsRead()
  }

  // Stats
  const byType = {
    INFO: notifications.filter(n => n.type === "INFO").length,
    WARNING: notifications.filter(n => n.type === "WARNING").length,
    ALERT: notifications.filter(n => n.type === "ALERT").length,
    SUCCESS: notifications.filter(n => n.type === "SUCCESS").length,
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">
            {unreadCount > 0 
              ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
              : "You're all caught up!"
            }
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={handleMarkAllRead}>
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark All as Read
          </Button>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-5 gap-4">
        <div 
          className={cn(
            "p-4 rounded-lg border transition-colors cursor-pointer",
            filter === "all" ? "ring-2 ring-primary border-primary" : "border-border hover:bg-accent"
          )}
          onClick={() => setFilter("all")}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold">{notifications.length}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </div>
            <Bell className="h-6 w-6 text-muted-foreground" />
          </div>
        </div>
        <div 
          className={cn(
            "p-4 rounded-lg border transition-colors cursor-pointer",
            filter === "unread" ? "ring-2 ring-primary border-primary" : "border-border hover:bg-accent"
          )}
          onClick={() => setFilter("unread")}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-blue-600">{unreadCount}</div>
              <div className="text-sm text-muted-foreground">Unread</div>
            </div>
            <Bell className="h-6 w-6 text-blue-500" />
          </div>
        </div>
        {Object.entries(byType).slice(0, 3).map(([type, count]) => {
          const config = severityConfig[type]
          const TypeIcon = config.icon
          return (
            <div 
              key={type}
              className="p-4 rounded-lg border border-border hover:bg-accent cursor-pointer transition-colors"
              onClick={() => setFilter("all")}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className={cn("text-2xl font-bold", config.text)}>{count}</div>
                  <div className="text-sm text-muted-foreground">{type}</div>
                </div>
                <TypeIcon className={cn("h-6 w-6", config.text.replace("-800", "-500"))} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Filter Tabs */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 border-b pb-4">
            <button
              onClick={() => setFilter("all")}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                filter === "all" 
                  ? "bg-primary text-primary-foreground" 
                  : "hover:bg-accent"
              )}
            >
              All
            </button>
            <button
              onClick={() => setFilter("unread")}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                filter === "unread" 
                  ? "bg-primary text-primary-foreground" 
                  : "hover:bg-accent"
              )}
            >
              Unread
            </button>
            <button
              onClick={() => setFilter("read")}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                filter === "read" 
                  ? "bg-primary text-primary-foreground" 
                  : "hover:bg-accent"
              )}
            >
              Read
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {filter === "all" ? "All Notifications" : 
             filter === "unread" ? "Unread Notifications" : 
             "Read Notifications"}
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({filteredNotifications.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="font-medium mb-2">Failed to load notifications</h3>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-12">
              <BellOff className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium mb-2">
                {filter === "unread" ? "All caught up!" : 
                 filter === "read" ? "No read notifications" : 
                 "No notifications yet"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {filter === "unread" 
                  ? "You have no unread notifications"
                  : "Check back later for updates"
                }
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredNotifications.map(notification => (
                <NotificationRow
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={handleMarkAsRead}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}