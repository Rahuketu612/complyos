"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, Eye, Clock, Loader2 } from "lucide-react"
import { useGstNotices, mockGstNotices, mockGstNoticeSummary } from "@/hooks/use-gst-notices"

const statusIcons = { pending: "text-orange-500", replied: "text-green-500", acknowledged: "text-blue-500", closed: "text-gray-500" }

function LoadingGrid() {
  return <div className="grid gap-4 md:grid-cols-2">{[1,2].map(i => <Card key={i}><CardContent className="pt-6"><div className="animate-pulse h-32 bg-muted rounded" /></CardContent></Card>)}</div>
}

function DemoBadge() {
  return <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded ml-2">Demo</span>
}

export default function GstNoticesPage() {
  const { data, isLoading } = useGstNotices()
  const notices = data?.notices || mockGstNotices
  const summary = data?.summary || mockGstNoticeSummary

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">GST Notices</h1>
        <p className="text-muted-foreground">Track and respond to GST notices {!isLoading && <DemoBadge />}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total Notices</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{summary.total}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Pending Reply</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-orange-500">{summary.pending}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Amount Involved</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">₹{(summary.amount / 1000).toFixed(0)}K</div></CardContent></Card>
      </div>

      {isLoading && <LoadingGrid />}

      {!isLoading && (
        <div className="space-y-4">
          {notices.map((notice) => (
            <Card key={notice.id}>
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-base">{notice.type.charAt(0).toUpperCase() + notice.type.slice(1)} Notice</CardTitle>
                  <p className="text-sm text-muted-foreground">{notice.reason}</p>
                </div>
                <AlertCircle className={statusIcons[(notice.status || 'pending') as keyof typeof statusIcons] || statusIcons.pending} />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Notice ID</span><span className="font-mono">{notice.noticeNumber || notice.id}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Received</span><span>{notice.receivedDate}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Due Date</span><span>{notice.dueDate}</span></div>
                  {notice.amount && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Amount</span><span className="font-semibold">₹{notice.amount.toLocaleString()}</span></div>}
                  <Button size="sm" className="w-full mt-2"><Eye className="h-4 w-4 mr-2" />View Details</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
