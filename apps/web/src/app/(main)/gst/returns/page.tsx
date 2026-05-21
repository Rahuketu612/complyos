"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, CheckCircle, Clock, AlertCircle, Loader2 } from "lucide-react"
import { useGstReturns, mockGstReturns, mockGstReturnSummary } from "@/hooks/use-gst-returns"

const statusConfig = {
  filed: { icon: CheckCircle, color: "text-green-500", label: "Filed" },
  pending: { icon: Clock, color: "text-orange-500", label: "Pending" },
  accepted: { icon: CheckCircle, color: "text-green-500", label: "Accepted" },
  rejected: { icon: AlertCircle, color: "text-red-500", label: "Rejected" },
}

function LoadingTable() {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="animate-pulse space-y-3">
          {[1,2,3,4].map(i => <div key={i} className="h-12 bg-muted rounded" />)}
        </div>
      </CardContent>
    </Card>
  )
}

function DemoBadge() {
  return <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded ml-2">Demo</span>
}

export default function GstReturnsPage() {
  const { data, isLoading } = useGstReturns('1')
  const returns = data?.returns || mockGstReturns
  const summary = data?.summary || mockGstReturnSummary

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">GST Returns</h1>
        <p className="text-muted-foreground">Track your GST filing status {!isLoading && <DemoBadge />}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">GSTR-1 Filed</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{summary.filed}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">GSTR-3B Filed</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{Math.floor(summary.filed * 0.8)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Tax Paid</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">₹{(summary.totalLiability / 100000).toFixed(1)}L</div></CardContent></Card>
      </div>

      {isLoading && <LoadingTable />}

      {!isLoading && (
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
                    const config = statusConfig[ret.status] || statusConfig.pending
                    const Icon = config.icon
                    return (
                      <tr key={i} className="border-b">
                        <td className="py-3 pr-4">{ret.taxPeriod?.slice(0,2)}/{ret.taxPeriod?.slice(2)}</td>
                        <td className="py-3 pr-4">{ret.formType}</td>
                        <td className="py-3 pr-4">{ret.dueDate}</td>
                        <td className="py-3 pr-4">{ret.filedDate || '-'}</td>
                        <td className="py-3 pr-4">{ret.totalLiability ? `₹${(ret.totalLiability / 1000).toFixed(0)}K` : '-'}</td>
                        <td className="py-3"><span className={`flex items-center gap-1 ${config.color}`}><Icon className="h-4 w-4" />{config.label}</span></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
