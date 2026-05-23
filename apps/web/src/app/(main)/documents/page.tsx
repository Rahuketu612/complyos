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

// ============ Stat Card ============
function StatCard({ label, value, variant = "default" }: { label: string; value: number; variant?: "default" | "warning" }) {
  const colors = { default: "text-foreground", warning: "text-orange-600" }
  return (
    <button className="p-4 rounded-lg border bg-card text-left hover:bg-accent/50 transition-colors w-full focus:ring-2 focus:ring-primary focus:outline-none">
      <div className={cn("text-2xl font-bold", colors[variant])}>{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </button>
  )
}

// ============ Document Card ============
function DocumentCard({ document }: { document: DocumentVault }) {
  const config = categoryConfig[document.category] || categoryConfig["OTHER"]
  const CategoryIcon = config.icon
  const isExpiringSoon = document.retentionDate && 
    new Date(document.retentionDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  return (
    <div className={cn(
      "p-4 rounded-lg border bg-card hover:shadow-md transition-all",
      isExpiringSoon && "border-orange-200"
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-lg", config.bg)}>
            <CategoryIcon className={cn("h-5 w-5", config.text)} />
          </div>
          <div>
            <span className="font-semibold text-sm">{document.name}</span>
            <div className="flex items-center gap-2 mt-1">
              <span className={cn("px-2 py-0.5 rounded text-xs font-medium", config.bg, config.text)}>
                {document.category}
              </span>
              <span className={cn(
                "px-2 py-0.5 rounded text-xs",
                document.status === 'ACTIVE' ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
              )}>
                {document.status || 'ACTIVE'}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {document.tags && document.tags.length > 0 && (
        <div className="flex items-center gap-1 mt-3 pt-3 border-t">
          {document.tags.slice(0, 3).map((tag, i) => (
            <span key={i} className="text-xs bg-muted px-2 py-0.5 rounded">{tag}</span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-3 pt-3 border-t text-xs text-muted-foreground">
        {document.retentionDate && (
          <div className={cn("flex items-center gap-1", isExpiringSoon && "text-orange-600 font-medium")}>
            <Calendar className="h-3 w-3" />
            {isExpiringSoon ? "Expiring soon" : new Date(document.retentionDate).toLocaleDateString()}
          </div>
        )}
        {document.uploadedAt && (
          <span>{new Date(document.uploadedAt).toLocaleDateString()}</span>
        )}
      </div>
    </div>
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Documents</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your document vault</p>
        </div>
        <Button disabled className="gap-2">
          <Upload className="h-4 w-4" />
          Upload
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Documents" value={documents.length} />
        <StatCard label="Expiring Soon" value={expiringCount} variant={expiringCount > 0 ? "warning" : "default"} />
        <StatCard label="Categories" value={Object.keys(byCategory).length} />
        <StatCard label="Active" value={documents.filter(d => d.status === 'ACTIVE').length} />
      </div>

      {/* Category Filter Buttons */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(byCategory).map(([cat, count]) => {
          const config = categoryConfig[cat] || categoryConfig["OTHER"]
          return (
            <button
              key={cat}
              onClick={() => setFilters(prev => ({ ...prev, category: filters.category === cat ? "" : cat }))}
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
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
            <X className="h-3 w-3" /> Clear
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            className="pl-10"
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
          />
        </div>
      </div>

      {/* Document Grid */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">
          {filters.category ? `${filters.category} (${filteredDocuments.length})` : `All Documents (${filteredDocuments.length})`}
        </h2>
        
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredDocuments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FolderOpen className="h-10 w-10 text-green-500 mx-auto mb-3" />
              <h3 className="font-medium mb-1">No documents</h3>
              <p className="text-sm text-muted-foreground">
                {filters.category || filters.search ? "Try adjusting your filters" : "Documents will appear here"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredDocuments.map(doc => (
              <DocumentCard key={doc.id} document={doc} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}