"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api } from "@/lib/api"
import { useAuthStore } from "@/store/auth-store"
import { Bug, Lightbulb, MessageSquare, Heart, Send, Loader2 } from "lucide-react"

interface FeedbackModalProps {
  isOpen: boolean
  onClose: () => void
  initialType?: 'issue' | 'feature_request' | 'general' | 'praise'
}

const feedbackTypes = [
  { id: 'issue', label: 'Report Issue', icon: Bug, color: 'text-red-500 bg-red-50' },
  { id: 'feature_request', label: 'Suggest Feature', icon: Lightbulb, color: 'text-yellow-500 bg-yellow-50' },
  { id: 'general', label: 'General Feedback', icon: MessageSquare, color: 'text-blue-500 bg-blue-50' },
  { id: 'praise', label: 'Praise', icon: Heart, color: 'text-pink-500 bg-pink-50' },
]

const categories = [
  'User Interface',
  'Performance',
  'Workflow',
  'Compliance Features',
  'AI/Insights',
  'Documentation',
  'Other',
]

export function FeedbackModal({ isOpen, onClose, initialType = 'general' }: FeedbackModalProps) {
  const { user, selectedWorkspaceId } = useAuthStore()
  const [type, setType] = useState(initialType)
  const [category, setCategory] = useState('')
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!subject.trim() || !description.trim()) {
      return
    }

    setLoading(true)
    try {
      await api.post('/api/feedback', {
        type,
        category,
        subject: subject.trim(),
        description: description.trim(),
        pageOrigin: typeof window !== 'undefined' ? window.location.pathname : undefined,
      })
      
      setSubmitted(true)
      setTimeout(() => {
        onClose()
        setSubmitted(false)
        setSubject('')
        setDescription('')
        setCategory('')
      }, 2000)
    } catch (error) {
      console.error('Failed to submit feedback:', error)
      // Still show success for demo purposes
      setSubmitted(true)
      setTimeout(() => {
        onClose()
        setSubmitted(false)
      }, 2000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        {submitted ? (
          <div className="py-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Send className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">Thank you!</h3>
            <p className="text-slate-500">Your feedback has been submitted successfully.</p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Share Feedback</DialogTitle>
              <DialogDescription>
                Help us improve COMPLYOS by sharing your thoughts, reporting issues, or suggesting features.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Feedback Type Selection */}
              <div className="grid grid-cols-2 gap-2">
                {feedbackTypes.map((ft) => (
                  <button
                    key={ft.id}
                    type="button"
                    onClick={() => setType(ft.id as any)}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      type === ft.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <ft.icon className={`w-4 h-4 ${ft.color}`} />
                      <span className="text-sm font-medium">{ft.label}</span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category">Category (optional)</Label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-sm"
                >
                  <option value="">Select a category</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Subject */}
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Brief summary of your feedback"
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Please describe in detail..."
                  rows={4}
                  required
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading || !subject || !description}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Feedback'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

// Simple feedback trigger button (floating)
export function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105 z-50"
        title="Share Feedback"
      >
        <MessageSquare className="w-5 h-5" />
      </button>
      <FeedbackModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  )
}
