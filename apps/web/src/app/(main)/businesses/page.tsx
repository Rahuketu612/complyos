"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Building2, Plus, Loader2, AlertCircle } from "lucide-react"
import { useBusinesses, mockBusinesses } from "@/hooks/use-businesses"
import { useAuthStore } from "@/store/auth-store"

function LoadingState() {
  return (
    <div className="space-y-4">
      {[1, 2].map(i => (
        <Card key={i}>
          <CardContent className="pt-6">
            <div className="animate-pulse h-20 bg-muted rounded" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No businesses found</p>
        <Button className="mt-4">Add Business</Button>
      </CardContent>
    </Card>
  )
}

function ErrorState({ error }: { error: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <p className="text-red-500">{error}</p>
      </CardContent>
    </Card>
  )
}

function DemoBadge() {
  return (
    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
      Demo
    </span>
  )
}

export default function BusinessesPage() {
  const { data: bizData, isLoading, isError, error } = useBusinesses()
  const businesses = bizData?.businesses || mockBusinesses

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Businesses</h1>
          <p className="text-muted-foreground">Manage your registered businesses</p>
        </div>
        <div className="flex gap-2">
          {!isLoading && <DemoBadge />}
          <Button><Plus className="h-4 w-4 mr-2" />Add Business</Button>
        </div>
      </div>

      {isLoading && <LoadingState />}
      {isError && <ErrorState error={(error as Error)?.message || "Failed to load"} />}
      {!isLoading && !isError && businesses.length === 0 && <EmptyState />}
      
      {!isLoading && !isError && businesses.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {businesses.map((biz) => (
            <Card key={biz.id}>
              <CardHeader className="flex flex-row items-start gap-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">{biz.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{biz.entityType}</p>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {biz.gstin && <div className="flex justify-between"><span className="text-muted-foreground">GSTIN</span><span className="font-mono">{biz.gstin}</span></div>}
                  {biz.pan && <div className="flex justify-between"><span className="text-muted-foreground">PAN</span><span className="font-mono">{biz.pan}</span></div>}
                  {biz.state && <div className="flex justify-between"><span className="text-muted-foreground">State</span><span>{biz.state}</span></div>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
