"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, CheckCircle, Clock, AlertCircle } from "lucide-react"

const returns = [
  { period: "Jan 2026", type: "GSTR-1", dueDate: "11-Feb-2026", status: "filed", filedDate: "05-Feb-2026", amount: "₹2.5L" },
  { period: "Jan 2026", type: "GSTR-3B", dueDate: "20-Feb-2026", status: "filed", filedDate: "18-Feb-2026", amount: "₹2.5L" },
  { period: "Feb 2026", type: "GSTR-1", dueDate: "11-Mar-2026", status: "pending", filedDate: "-", amount: "-" },
  { period: "Feb 2026", type: "GSTR-3B", dueDate: "20-Mar-2026", status: "pending", filedDate: "-", amount: "-" },
]

const statusConfig = {
  filed: { icon: CheckCircle, color: "text-green-500", label: "Filed" },
  pending: { icon: Clock, color: "text-orange-500", label: "Pending" },
}

export default function GstReturnsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">GST Returns</h1>
        <p className="text-muted-foreground">Track your GST filing status</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">GSTR-1 Filed</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">12</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">GSTR-3B Filed</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">12</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Tax Paid</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">₹30L</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Filing History</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 pr-4">Period</th>
                  <th className="text-left py-3 pr-4">Type</th>
                  <th className="text-left py-3 pr-4">Due Date</th>
                  <th className="text-left py-3 pr-4">Filed Date</th>
                  <th className="text-left py-3 pr-4">Amount</th>
                  <th className="text-left py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {returns.map((ret, i) => {
                  const config = statusConfig[ret.status as keyof typeof statusConfig]
                  const Icon = config?.icon || AlertCircle
                  return (
                    <tr key={i} className="border-b">
                      <td className="py-3 pr-4">{ret.period}</td>
                      <td className="py-3 pr-4">{ret.type}</td>
                      <td className="py-3 pr-4">{ret.dueDate}</td>
                      <td className="py-3 pr-4">{ret.filedDate}</td>
                      <td className="py-3 pr-4">{ret.amount}</td>
                      <td className="py-3">
                        <span className={`flex items-center gap-1 ${config?.color || "text-gray-500"}`}>
                          <Icon className="h-4 w-4" />{config?.label || ret.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}