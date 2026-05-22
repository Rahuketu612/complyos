"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuthStore } from "@/store/auth-store"
import { useWorkspaceStore, getRoleBadgeColor, getRoleDisplayName } from "@/stores/workspace-store"
import { useCaWorkspaces, useCaFirms, Workspace, Firm } from "@/hooks/use-ca-service"
import { cn } from "@/lib/utils"
import {
  Briefcase,
  Users,
  Calendar,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Plus,
  ChevronRight,
  Building2
} from "lucide-react"

// ============ Workspace Card ============

function WorkspaceCard({ workspace, onClick }: { workspace: Workspace; onClick: () => void }) {
  return (
    <div className="cursor-pointer hover:shadow-md transition-shadow border-2 rounded-lg border-border hover:border-primary/50 bg-card p-4"
      onClick={onClick}
    >
      <div className="flex flex-row items-start justify-between pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Briefcase className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-medium">{workspace.name}</h3>
            <p className="text-sm text-muted-foreground">{workspace.type}</p>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </div>
      <div>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-2 bg-muted/50 rounded-lg">
            <div className="text-lg font-bold">{workspace.memberCount || 0}</div>
            <div className="text-xs text-muted-foreground">Members</div>
          </div>
          <div className="text-center p-2 bg-muted/50 rounded-lg">
            <div className="text-lg font-bold">{workspace.complianceScore || 0}%</div>
            <div className="text-xs text-muted-foreground">Compliance</div>
          </div>
          <div className="text-center p-2 bg-muted/50 rounded-lg">
            <div className={cn(
              "text-lg font-bold",
              workspace.status === 'active' ? "text-green-600" : "text-orange-600"
            )}>
              {workspace.status === 'active' ? 'Active' : 'Inactive'}
            </div>
            <div className="text-xs text-muted-foreground">Status</div>
          </div>
        </div>
        {workspace.lastActivity && (
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            Last active: {new Date(workspace.lastActivity).toLocaleDateString()}
          </div>
        )}
      </div>
    </div>
  )
}

// ============ Main Workspaces Page ============

export default function WorkspacesPage() {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()
  const { setSelectedWorkspace } = useWorkspaceStore()
  const { workspaces, loading: wsLoading, error: wsError } = useCaWorkspaces()
  const { firms, loading: firmsLoading } = useCaFirms()

  const selectWorkspace = (ws: Workspace) => {
    setSelectedWorkspace({
      id: ws.id,
      name: ws.name,
      type: ws.type,
      role: 'user',
      complianceScore: ws.complianceScore
    })
    router.push(`/dashboard`)
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Workspaces</h1>
          <p className="text-muted-foreground">Manage client workspaces and firms</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Building2 className="h-4 w-4 mr-2" />
            New Firm
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Workspace
          </Button>
        </div>
      </div>

      {/* Firms Section */}
      {firms && firms.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Firms
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {firms.map(firm => (
              <Card key={firm.id} className="bg-gradient-to-br from-slate-50 to-slate-100">
                <CardHeader>
                  <CardTitle className="text-lg">{firm.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{firm.type}</p>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{firm.memberCount} members</span>
                    </div>
                    <span className={cn(
                      "px-2 py-1 rounded text-xs font-medium",
                      firm.workspaces?.length > 0 ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                    )}>
                      {firm.workspaces?.length || 0} workspaces
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Workspaces Section */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Briefcase className="h-5 w-5" />
          Client Workspaces
        </h2>
        
        {wsLoading || firmsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : wsError ? (
          <Card className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="font-medium mb-2">Failed to load workspaces</h3>
            <p className="text-sm text-muted-foreground">{wsError}</p>
          </Card>
        ) : workspaces.length === 0 ? (
          <Card className="p-8 text-center">
            <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium mb-2">No workspaces yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first workspace to start managing compliance
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Workspace
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {workspaces.map(workspace => (
              <WorkspaceCard
                key={workspace.id}
                workspace={workspace}
                onClick={() => selectWorkspace(workspace)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Quick Stats */}
      {workspaces.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{workspaces.length}</div>
                <div className="text-sm text-muted-foreground">Total Workspaces</div>
              </div>
              <Briefcase className="h-8 w-8 text-blue-500" />
            </div>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">
                  {workspaces.filter(w => w.status === 'active').length}
                </div>
                <div className="text-sm text-muted-foreground">Active</div>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">
                  {workspaces.reduce((sum, w) => sum + (w.memberCount || 0), 0)}
                </div>
                <div className="text-sm text-muted-foreground">Total Members</div>
              </div>
              <Users className="h-8 w-8 text-purple-500" />
            </div>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">
                  {workspaces.length > 0 
                    ? Math.round(workspaces.reduce((sum, w) => sum + (w.complianceScore || 0), 0) / workspaces.length)
                    : 0}%
                </div>
                <div className="text-sm text-muted-foreground">Avg Compliance</div>
              </div>
              <TrendingUp className="h-8 w-8 text-amber-500" />
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}