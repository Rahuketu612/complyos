"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuthStore } from "@/store/auth-store"
import { api } from "@/lib/api"

interface LoginResponse {
  user: { id: string; email: string; firstName: string; lastName?: string; tenantId: string }
  tenant: { id: string; name: string; slug: string }
  tokens: { accessToken: string; refreshToken: string; expiresIn: number }
  requiresMfa: boolean
}

export default function LoginPage() {
  const router = useRouter()
  const login = useAuthStore((state) => state.login)
  const setSelectedBusiness = useAuthStore((state) => state.setSelectedBusiness)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const response = await api.post<LoginResponse>("/api/auth/login", { email, password })
      
      // Map backend response to frontend store format
      const { user, tenant, tokens, requiresMfa } = response
      
      // Store tokens and business context
      login({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }, {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      })
      
      // Store tenant/business context for later selection
      if (tenant) {
        setSelectedBusiness(tenant.id, tenant.name)
      }
      
      // Redirect to dashboard
      router.push("/dashboard")
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Invalid credentials"
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome to COMPLYOS</CardTitle>
          <CardDescription>Sign in to your compliance dashboard</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md">{error}</div>}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
