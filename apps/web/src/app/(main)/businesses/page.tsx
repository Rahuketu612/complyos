"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Building2, Plus } from "lucide-react"

const businesses = [
  { id: "1", name: "ABC Technologies Pvt Ltd", gstin: "27AABCI1234C1Z5", type: "Private Limited", state: "Maharashtra" },
  { id: "2", name: "XYZ Traders", gstin: "27AAAPX5678C1Z3", type: "Partnership", state: "Delhi" },
]

export default function BusinessesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Businesses</h1>
          <p className="text-muted-foreground">Manage your registered businesses</p>
        </div>
        <Button><Plus className="h-4 w-4 mr-2" />Add Business</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {businesses.map((biz) => (
          <Card key={biz.id}>
            <CardHeader className="flex flex-row items-start gap-4">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">{biz.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{biz.type}</p>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">GSTIN</span><span className="font-mono">{biz.gstin}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">State</span><span>{biz.state}</span></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}