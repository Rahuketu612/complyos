"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, Eye, Calendar } from "lucide-react"

const notices = [
  { id: "TRN-001", type: "Scrutiny", reason: "ITC Mismatch", date: "15-Jan-2026", dueDate: "30-Jan-2026", status: "pending", amount: "₹50,000" },
  { id: "TRN-002", type: "Demand", reason: "Short Payment", date: "10-Jan-2026", dueDate: "25-Jan-2026", status: "replied", amount: "₹25,000" },
]

export default function GstNoticesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">GST Notices</h1>
        <p className="text-muted-foreground">Track and respond to GST notices</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total Notices</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">15</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Pending Reply</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-orange-500">3</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Amount Involved</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">₹1.2L</div></CardContent></Card>
      </div>

      <div className="space-y-4">
        {notices.map((notice) => (
          <Card key={notice.id}>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="text-base">{notice.type} Notice</CardTitle>
                <p className="text-sm text-muted-foreground">{notice.reason}</p>
              </div>
              <AlertCircle className={notice.status === "pending" ? "h-5 w-5 text-orange-500" : "h-5 w-5 text-green-500"} />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Notice ID</span><span className="font-mono">{notice.id}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Received</span><span>{notice.date}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Due Date</span><span>{notice.dueDate}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount</span><span className="font-semibold">{notice.amount}</span>
                </div>
                <Button size="sm" className="w-full mt-2"><Eye className="h-4 w-4 mr-2" />View Details</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}