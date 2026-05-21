"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { useAuthStore } from "@/store/auth-store"

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, selectedBusinessId, setSelectedBusiness } = useAuthStore()

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/")
      return
    }
  }, [isAuthenticated, router])

  // Auto-select first business if none selected (needs businesses loaded)
  // This will be handled after businesses fetch in the component

  if (!isAuthenticated) {
    return null // or loading spinner
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        {children}
      </main>
    </div>
  )
}