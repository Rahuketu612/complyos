"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, AlertTriangle, CheckCircle, XCircle } from "lucide-react"

const vendors = [
  { name: "ABC Supplies", gstin: "27AABCI1234C1Z5", compliance: "good", risk: "low", itc: "₹2.5L" },
  { name: "XYZ Materials", gstin: "27AAAPX5678C1Z3", compliance: "good", risk: "medium", itc: "₹1.2L" },
  { name: "PQR Logistics", gstin: "27AAQP9876C1Z1", compliance: "poor", risk: "high", itc: "₹80,000" },
]

const riskConfig = {
  low: { icon: CheckCircle, color: "text-green-500", label: "Low Risk" },
  medium: { icon: AlertTriangle, color: "text-orange-500", label: "Medium Risk" },
  high: { icon: XCircle, color: "text-red-500", label: "High Risk" },
}

export default function VendorsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Vendor Intelligence</h1>
        <p className="text-muted-foreground">Monitor vendor compliance and ITC risks</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total Vendors</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">150</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Compliant</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-green-500">142</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">ITC at Risk</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-red-500">₹4.5L</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Vendor List</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {vendors.map((vendor, i) => {
              const config = riskConfig[vendor.risk as keyof typeof riskConfig]
              const Icon = config?.icon || AlertTriangle
              return (
                <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
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
                      <div className="font-semibold">{vendor.itc}</div>
                    </div>
                    <div className={`flex items-center gap-1 ${config?.color}`}>
                      <Icon className="h-4 w-4" />
                      <span className="text-sm">{config?.label}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}