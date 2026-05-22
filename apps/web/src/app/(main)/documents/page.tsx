"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuthStore } from "@/store/auth-store"
import { useWorkspaceStore } from "@/stores/workspace-store"
import { useCaDocuments, DocumentVault } from "@/hooks/use-ca-service"
import { cn } from "@/lib/utils"
import {
  FileText,
  FolderOpen,
  Search,
  Filter,
  Plus,
  Loader2,
  Calendar,
  Tag,
  AlertTriangle,
  Upload,
  X
} from "lucide-react"

// ============ Filter Types ============

interface DocumentFilters {
  category: string
  search: string
}

// ============ Category Config ============

const categoryConfig: Record<string, { bg: string; text: string; icon: any }> = {
  "TAX": { bg: "bg-blue-100", text: "text-blue-800", icon: FileText },
  "COMPLIANCE": { bg: "bg-green-100", text: "text-green-800", icon: FileText },
  "CONTRACT": { bg: "bg-purple-100", text: "text-purple-800", icon: FileText },
  "INVOICE": { bg: "bg-orange-100", text: "text-orange-800", icon: FileText },
  "REGULATORY": { bg: "bg-red-100", text: "text-red-800", icon: FileText },
  "OTHER": { bg: "bg-gray-100", text: "text-gray-800", icon: FileText },
}

const categories = [
  { value: "", label: "All Categories" },
  { value: "TAX", label: "Tax Documents" },
  { value: "COMPLIANCE", label: "Compliance" },
  { value: "CONTRACT", label: "Contracts" },
  { value: "INVOICE", label: "Invoices" },
  { value: "REGULATORY", label: "Regulatory" },
  { value: "OTHER", label: "Other" },
]

const defaultFilters: DocumentFilters = {
  category: "",
  search: "",
}

// ============ Document Row ============

function DocumentRow({ document }: { document: DocumentVault }) {
  const config = categoryConfig[document.category] || categoryConfig["OTHER"]
  const CategoryIcon = config.icon
  const isExpiringSoon = document.retentionDate && 
    new Date(document.retentionDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  return (
    <tr className="border-b hover:bg-muted/50">
      <td className="p-3">
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-lg", config.bg)}>
            <CategoryIcon className={cn("h-4 w-4", config.text)} />
          </div>
          <div>
            <span className="font-medium text-sm">{document.name}</span>
            {document.tags && document.tags.length > 0 && (
              <div className="flex items-center gap-1 mt-1">
                {document.tags.slice(0, 3).map((tag, i) => (
                  <span key={i} className="text-xs bg-muted px-1.5 py-0.5 rounded">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </td>
      <td className="p-3">
        <span className={cn("px-2 py-1 rounded text-xs font-medium", config.bg, config.text)}>
          {document.category}
        </span>
      </td>
      <td className="p-3">
        {document.retentionDate && (
          <div className={cn(
            "flex items-center gap-1 text-sm",
            isExpiringSoon ? "text-orange-600" : "text-muted-foreground"
          )}>
            <Calendar className="h-3 w-3" />
            <span>
              {new Date(document.retentionDate).toLocaleDateString()}
              {isExpiringSoon && (
                <span className="ml-2 text-xs font-medium">(Expiring soon)</span>
              )}
            </span>
          </div>
        )}
      </td>
      <td className="p-3">
        <span className={cn(
          "px-2 py-1 rounded text-xs font-medium",
          document.status === 'ACTIVE' ? "bg-green-100 text-green-800" :
          document.status === 'ARCHIVED' ? "bg-gray-100 text-gray-800" :
          "bg-yellow-100 text-yellow-800"
        )}>
          {document.status || 'ACTIVE'}
        </span>
      </td>
      <td className="p-3">
        {document.uploadedBy && (
          <span className="text-sm text-muted-foreground">{document.uploadedBy}</span>
        )}
      </td>
      <td className="p-3">
        {document.uploadedAt && (
          <span className="text-sm text-muted-foreground">
            {new Date(document.uploadedAt).toLocaleDateString()}
          </span>
        )}
      </td>
    </tr>
  )
}

// ============ Main Documents Page ============

export default function DocumentsPage() {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()
  const { selectedWorkspace } = useWorkspaceStore()
  const [filters, setFilters] = useState<DocumentFilters>(defaultFilters)
  const [showFilters, setShowFilters] = useState(false)

  const { documents, loading, error } = useCaDocuments({
    category: filters.category || undefined,
  })

  // Filter by search
  const filteredDocuments = documents.filter(doc => {
    if (!filters.search) return true
    const search = filters.search.toLowerCase()
    return (
      doc.name.toLowerCase().includes(search) ||
      doc.category.toLowerCase().includes(search) ||
      doc.tags?.some(t => t.toLowerCase().includes(search))
    )
  })

  // Stats
  const expiringCount = documents.filter(d => 
    d.retentionDate && new Date(d.retentionDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  ).length

  const byCategory = categories.reduce((acc, cat) => {
    if (cat.value) {
      acc[cat.value] = documents.filter(d => d.category === cat.value).length
    }
    return acc
  }, {} as Record<string, number>)

  const hasActiveFilters = filters.category || filters.search

  const clearFilters = () => {
    setFilters(defaultFilters)
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Documents</h1>
          <p className="text-muted-foreground">
            {selectedWorkspace ? `Workspace: ${selectedWorkspace.name}` : "Document vault management"}
          </p>
        </div>
        <Button disabled>
          <Upload className="h-4 w-4 mr-2" />
          Upload Document
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold">{documents.length}</div>
              <div className="text-sm text-muted-foreground">Total Documents</div>
            </div>
            <FolderOpen className="h-8 w-8 text-blue-500" />
          </div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold">{expiringCount}</div>
              <div className="text-sm text-muted-foreground">Expiring Soon</div>
            </div>
            <AlertTriangle className="h-8 w-8 text-orange-500" />
          </div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold">
                {Object.values(byCategory).reduce((a, b) => a + b, 0)}
              </div>
              <div className="text-sm text-muted-foreground">By Category</div>
            </div>
            <Tag className="h-8 w-8 text-green-500" />
          </div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold">{selectedWorkspace?.name || 'None'}</div>
              <div className="text-sm text-muted-foreground">Current Workspace</div>
            </div>
            <FileText className="h-8 w-8 text-purple-500" />
          </div>
        </Card>
      </div>

      {/* Category Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Documents by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Object.entries(byCategory).map(([cat, count]) => {
              const config = categoryConfig[cat] || categoryConfig["OTHER"]
              return (
                <button
                  key={cat}
                  onClick={() => setFilters({ ...filters, category: cat })}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors",
                    filters.category === cat 
                      ? "border-primary bg-primary/10" 
                      : "border-border hover:bg-accent"
                  )}
                >
                  <span className={cn("px-2 py-0.5 rounded text-xs font-medium", config.bg, config.text)}>
                    {cat}
                  </span>
                  <span className="text-sm font-medium">{count}</span>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search documents..."
                className="pl-10"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </div>
            <select
              className="border rounded-lg px-3 py-2 bg-background"
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            >
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Documents Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {hasActiveFilters ? `Filtered Documents (${filteredDocuments.length})` : `All Documents (${filteredDocuments.length})`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-12">
              <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium mb-2">
                {hasActiveFilters ? "No documents match your filters" : "No documents yet"}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {hasActiveFilters ? "Try adjusting your filters" : "Upload your first document to get started"}
              </p>
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters}>Clear Filters</Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium">Document</th>
                    <th className="text-left p-3 font-medium">Category</th>
                    <th className="text-left p-3 font-medium">Retention Date</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium">Uploaded By</th>
                    <th className="text-left p-3 font-medium">Uploaded At</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDocuments.map(doc => (
                    <DocumentRow key={doc.id} document={doc} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}