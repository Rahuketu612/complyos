"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, AlertTriangle, CheckCircle, XCircle, Loader2 } from "lucide-react"
import { useVendors, mockVendors, mockVendorSummary } from "@/hooks/use-vendors"

const riskConfig = {
  low: { icon: CheckCircle, color: "text-green-500", label: "Low Risk" },
  medium: { icon: AlertTriangle, color: "text-orange-500", label: "Medium Risk" },
  high: { icon: XCircle, color: "text-red-500", label: "High Risk" },
  critical: { icon: XCircle, color: "text-red-700", label: "Critical" },
}

function LoadingList() {
  return <Card><CardContent className="pt-6"><div className="animate-pulse space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-muted rounded" />)}</div></CardContent></Card>
}

function DemoBadge() {
  return <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded ml-2">Demo</span>
}

export default function VendorsPage() {
  const { data, isLoading } = useVendors('1')
  const vendors = data?.vendors || mockVendors
  const summary = data?.summary || mockVendorSummary

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Vendor Intelligence</h1>
        <p className="text-muted-foreground">Monitor vendor compliance and ITC risks {!isLoading && <DemoBadge />}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total Vendors</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{summary.total}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Compliant</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-green-500">{summary.compliant}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">ITC at Risk</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-red-500">₹{(summary.itcAtRisk / 1000).toFixed(0)}K</div></CardContent></Card>
      </div>

      {isLoading && <LoadingList />}

      {!isLoading && (
        <Card>
          <CardHeader><CardTitle>Vendor List</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {vendors.map((vendor) => {
                const config = riskConfig[vendor.riskLevel]
                const Icon = config.icon
                return (
                  <div key={vendor.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-medium">{vendor.name}</div>
                        <div className="text-sm text-muted-foreground font-mono">{vendor.gstin}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">ITC</div>
                        <div className="font-semibold">₹{((vendor.totalItcClaimed || 0) / 1000).toFixed(0)}K</div>
                      </div>
                      <div className={`flex items-center gap-1 ${config.color}`}>
                        <Icon className="h-4 w-4" />
                        <span className="text-sm">{config.label}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
