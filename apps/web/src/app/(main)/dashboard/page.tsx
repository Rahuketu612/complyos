"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  ShieldCheck, 
  FileText, 
  AlertTriangle, 
  TrendingDown, 
  CheckCircle
} from "lucide-react"

const stats = [
  { title: "Compliance Score", value: "85%", change: "+5%", icon: ShieldCheck, color: "text-green-500" },
  { title: "GST Filed", value: "12/12", change: "On Time", icon: FileText, color: "text-blue-500" },
  { title: "Notices Pending", value: "2", change: "-1", icon: AlertTriangle, color: "text-orange-500" },
  { title: "ITC at Risk", value: "₹2.5L", change: "-12%", icon: TrendingDown, color: "text-red-500" },
]

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your compliance status</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className={stat.color} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.change}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader><CardTitle>Recent Compliance Activity</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { action: "GSTR-3B Filed", detail: "January 2026", status: "filed" },
              { action: "Notice Received", detail: "GST-TRN-2026-0042", status: "pending" },
              { action: "Vendor Payment", detail: "ABC Suppliers", status: "done" },
              { action: "ITC Claimed", detail: "₹1.2 Lakhs", status: "verified" },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>{item.action}</span>
                </div>
                <span className="text-sm text-muted-foreground">{item.detail}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}