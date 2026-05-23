"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useAuthStore } from "@/store/auth-store"
import { useWorkspaceStore } from "@/stores/workspace-store"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import {
  ChevronLeft, Send, Lock, Unlock, Paperclip, FileText,
  AlertTriangle, CheckCircle2, Clock, User, FileQuestion,
  MoreVertical, Sparkles, Loader2, Eye, EyeOff
} from "lucide-react"

interface Message {
  id: string
  senderId: string
  senderRole: string
  senderName: string
  message: string
  messageType: string
  isInternalNote: boolean
  documentId?: string
  document?: { id: string; fileName: string; fileType: string; category: string }
  createdAt: string
  sender: { id: string; firstName: string; lastName: string; role: string }
}

interface EvidenceRequest {
  id: string
  title: string
  description?: string
  status: string
  dueDate?: string
  document?: { id: string; fileName: string; fileType: string }
  requester: { id: string; firstName: string; lastName: string }
  uploadedAt?: string
  verifiedAt?: string
  rejectReason?: string
}

interface Thread {
  id: string
  subject: string
  type: string
  status: string
  priority: string
  createdAt: string
  updatedAt: string
  aiSummary?: string
  workspace: { id: string; name: string }
  business?: { id: string; name: string; pan: string }
  creator: { id: string; firstName: string; lastName: string; role: string }
  assignee?: { id: string; firstName: string; lastName: string; role: string }
  notice?: { id: string; subject: string; severity: string; status: string; responseDueDate?: string }
  task?: { id: string; title: string; status: string; dueDate?: string }
  messages: Message[]
  evidenceRequests: EvidenceRequest[]
}

const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
  OPEN: { label: "Open", bg: "bg-blue-100", text: "text-blue-800" },
  WAITING_CLIENT: { label: "Waiting Client", bg: "bg-orange-100", text: "text-orange-800" },
  WAITING_INTERNAL: { label: "In Progress", bg: "bg-yellow-100", text: "text-yellow-800" },
  RESOLVED: { label: "Resolved", bg: "bg-green-100", text: "text-green-800" },
}

const evidenceStatusConfig: Record<string, { label: string; bg: string; text: string }> = {
  REQUESTED: { label: "Requested", bg: "bg-red-100", text: "text-red-700" },
  UPLOADED: { label: "Uploaded", bg: "bg-blue-100", text: "text-blue-700" },
  VERIFIED: { label: "Verified", bg: "bg-green-100", text: "text-green-700" },
  REJECTED: { label: "Rejected", bg: "bg-gray-100", text: "text-gray-700" },
}

const statusOptions = [
  { value: 'OPEN', label: 'Open' },
  { value: 'WAITING_CLIENT', label: 'Waiting Client' },
  { value: 'WAITING_INTERNAL', label: 'In Progress' },
  { value: 'RESOLVED', label: 'Resolved' },
]

function MessageBubble({ message, currentUserId }: { message: Message; currentUserId: string }) {
  const isOwn = message.senderId === currentUserId
  const isSystem = message.messageType === 'SYSTEM'
  const isInternal = message.isInternalNote

  if (isSystem) {
    return (
      <div className="flex justify-center my-4">
        <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{message.message}</span>
          <span>•</span>
          <span>{new Date(message.createdAt).toLocaleString()}</span>
        </div>
      </div>
    )
  }

  return (
    <div className={cn(
      "flex gap-3 my-4",
      isOwn ? "flex-row-reverse" : "flex-row"
    )}>
      <div className={cn(
        "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
        isOwn ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700"
      )}>
        {message.senderName.charAt(0).toUpperCase()}
      </div>
      <div className={cn(
        "max-w-[70%] rounded-lg p-3",
        isOwn ? "bg-blue-500 text-white" : isInternal ? "bg-yellow-50 border border-yellow-200" : "bg-gray-100",
        isInternal && "border-2 border-dashed border-yellow-300"
      )}>
        {isInternal && (
          <div className="flex items-center gap-1 text-xs text-yellow-700 mb-2">
            <Lock className="h-3 w-3" />
            Internal Note
          </div>
        )}
        <div className="flex items-center gap-2 mb-1">
          <span className={cn("text-sm font-medium", isOwn ? "text-white/90" : "text-gray-900")}>
            {message.senderName}
          </span>
          <span className={cn("text-xs", isOwn ? "text-white/70" : "text-gray-500")}>
            {message.senderRole}
          </span>
        </div>
        <p className={cn("text-sm", isOwn ? "text-white" : "text-gray-700")}>
          {message.message}
        </p>
        {message.document && (
          <div className="mt-2 flex items-center gap-2 p-2 bg-white/10 rounded">
            <FileText className="h-4 w-4" />
            <span className="text-xs">{message.document.fileName}</span>
          </div>
        )}
        <div className={cn("text-xs mt-2", isOwn ? "text-white/70" : "text-gray-400")}>
          {new Date(message.createdAt).toLocaleTimeString()}
        </div>
      </div>
    </div>
  )
}

export default function ThreadDetailPage() {
  const router = useRouter()
  const params = useParams()
  const threadId = params.id as string
  const { isAuthenticated, user } = useAuthStore()
  const { selectedWorkspace } = useWorkspaceStore()

  const [thread, setThread] = useState<Thread | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState("")
  const [isInternalNote, setIsInternalNote] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [newStatus, setNewStatus] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isAuthenticated) { router.push("/"); return }
    fetchThread()
  }, [isAuthenticated, router, threadId])

  const fetchThread = async () => {
    try {
      setLoading(true)
      const response = await api.get<Thread>(`/api/communications/${threadId}`)
      setThread(response)
      setNewStatus(response.status)
    } catch (err) {
      console.error("Failed to fetch thread:", err)
      router.push("/communications")
    } finally {
      setLoading(false)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [thread?.messages])

  const handleSendMessage = async () => {
    if (!message.trim() || submitting) return
    try {
      setSubmitting(true)
      await api.post(`/api/communications/${threadId}/messages`, {
        message: message.trim(),
        isInternalNote,
      })
      setMessage("")
      setIsInternalNote(false)
      fetchThread()
    } catch (err) {
      console.error("Failed to send message:", err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleStatusChange = async () => {
    if (newStatus === thread?.status || !thread) return
    try {
      await api.put(`/api/communications/${threadId}/status`, {
        status: newStatus,
      })
      fetchThread()
    } catch (err) {
      console.error("Failed to update status:", err)
    }
  }

  const handleEvidenceStatus = async (requestId: string, status: string) => {
    try {
      await api.put(`/api/communications/evidence/${requestId}/status`, { status })
      fetchThread()
    } catch (err) {
      console.error("Failed to update evidence:", err)
    }
  }

  if (loading || !thread) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const status = statusConfig[thread.status] || statusConfig.OPEN
  const isCA = user?.role === 'CA' || user?.role === 'ADMIN'

  return (
    <div className="flex gap-6 h-[calc(100vh-120px)]">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white rounded-lg border">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.push("/communications")}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <div className="flex-1">
              <h2 className="font-semibold">{thread.subject}</h2>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{thread.workspace.name}</span>
                {thread.business && <span>• {thread.business.name}</span>}
                {thread.notice && (
                  <span className="flex items-center gap-1 text-red-600">
                    <AlertTriangle className="h-3 w-3" />
                    Linked Notice
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className={cn(
                  "px-3 py-1 rounded-lg text-sm font-medium border",
                  status.bg, status.text
                )}
              >
                {statusOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {newStatus !== thread.status && (
                <Button size="sm" onClick={handleStatusChange}>Update</Button>
              )}
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4">
          {thread.messages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No messages yet. Start the conversation.
            </div>
          ) : (
            thread.messages.map(msg => (
              <MessageBubble key={msg.id} message={msg} currentUserId={user?.id || ''} />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="p-4 border-t bg-gray-50">
          {isCA && (
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() => setIsInternalNote(!isInternalNote)}
                className={cn(
                  "flex items-center gap-1 px-3 py-1 rounded text-xs",
                  isInternalNote ? "bg-yellow-100 text-yellow-700 border border-yellow-300" : "bg-gray-100"
                )}
              >
                {isInternalNote ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                {isInternalNote ? "Internal Note" : "Public Message"}
              </button>
              <span className="text-xs text-muted-foreground">
                {isInternalNote ? "Only visible to CA/internal" : "Visible to client"}
              </span>
            </div>
          )}
          <div className="flex gap-2">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={isInternalNote ? "Add internal note..." : "Type your message..."}
              className="min-h-[60px]"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage()
                }
              }}
            />
            <Button onClick={handleSendMessage} disabled={!message.trim() || submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-80 space-y-4 overflow-y-auto">
        {/* Thread Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Thread Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <span className="text-muted-foreground">Created:</span>
              <span className="ml-2">{new Date(thread.createdAt).toLocaleDateString()}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Creator:</span>
              <span className="ml-2">{thread.creator.firstName} {thread.creator.lastName}</span>
            </div>
            {thread.assignee && (
              <div>
                <span className="text-muted-foreground">Assigned:</span>
                <span className="ml-2">{thread.assignee.firstName} {thread.assignee.lastName}</span>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Messages:</span>
              <span className="ml-2">{thread.messages.length}</span>
            </div>
          </CardContent>
        </Card>

        {/* Linked Notice */}
        {thread.notice && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                Linked Notice
              </CardTitle>
            </CardHeader>
            <CardContent>
              <button
                onClick={() => router.push(`/notices/${thread.notice!.id}`)}
                className="w-full text-left p-2 rounded bg-red-50 hover:bg-red-100 transition-colors"
              >
                <div className="font-medium text-sm">{thread.notice.subject}</div>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <span className={cn(
                    "px-2 py-0.5 rounded",
                    thread.notice.severity === 'CRITICAL' ? "bg-red-200 text-red-800" :
                    thread.notice.severity === 'HIGH' ? "bg-orange-200 text-orange-800" : "bg-yellow-200 text-yellow-800"
                  )}>
                    {thread.notice.severity}
                  </span>
                  {thread.notice.responseDueDate && (
                    <span>Due: {new Date(thread.notice.responseDueDate).toLocaleDateString()}</span>
                  )}
                </div>
              </button>
            </CardContent>
          </Card>
        )}

        {/* Evidence Requests */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileQuestion className="h-4 w-4" />
                Evidence Requests
              </span>
              <Button size="sm" variant="outline" onClick={() => router.push(`/communications/${threadId}?action=add-evidence`)}>
                Add Evidence
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {thread.evidenceRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No evidence requests</p>
            ) : (
              <div className="space-y-2">
                {thread.evidenceRequests.map(req => {
                  const reqStatus = evidenceStatusConfig[req.status] || evidenceStatusConfig.REQUESTED
                  return (
                    <div key={req.id} className="p-2 border rounded">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{req.title}</span>
                        <span className={cn("px-2 py-0.5 rounded text-xs", reqStatus.bg, reqStatus.text)}>
                          {reqStatus.label}
                        </span>
                      </div>
                      {req.dueDate && (
                        <div className="text-xs text-muted-foreground mb-2">
                          Due: {new Date(req.dueDate).toLocaleDateString()}
                        </div>
                      )}
                      {req.status === 'UPLOADED' && (
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleEvidenceStatus(req.id, 'VERIFIED')}>
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Verify
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleEvidenceStatus(req.id, 'REJECTED')}>
                            <FileQuestion className="h-3 w-3 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}
                      {req.rejectReason && (
                        <div className="text-xs text-red-600 mt-1">Rejected: {req.rejectReason}</div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Summary */}
        {thread.aiSummary && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-600" />
                AI Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{thread.aiSummary}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}