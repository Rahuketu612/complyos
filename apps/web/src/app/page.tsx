"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuthStore } from "@/store/auth-store"
import { api } from "@/lib/api"
import { Loader2, AlertCircle } from "lucide-react"

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
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const response = await api.post<LoginResponse>("/api/auth/login", { email, password })

      const { user, tenant, tokens } = response

      login({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }, {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      })

      if (tenant) {
        setSelectedBusiness(tenant.id, tenant.name)
      }

      router.push("/dashboard")
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Invalid email or password. Please try again."
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleDemoLogin = async () => {
    setEmail("demo@complyos.com")
    setPassword("Demo@123")
    setError("")
    setLoading(true)
    
    try {
      const response = await api.post<LoginResponse>("/api/auth/login", { 
        email: "demo@complyos.com", 
        password: "Demo@123" 
      })

      const { user, tenant, tokens } = response

      login({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }, {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      })

      if (tenant) {
        setSelectedBusiness(tenant.id, tenant.name)
      }

      router.push("/dashboard")
    } catch (err) {
      setError("Demo login failed. Please ensure the database is seeded.")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-100 rounded-full opacity-50 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-100 rounded-full opacity-50 blur-3xl" />
      </div>
      
      <Card className="w-full max-w-md relative bg-white/95 backdrop-blur shadow-xl border-slate-200">
        <CardHeader className="text-center space-y-4 pb-2">
          {/* Logo */}
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
            <span className="text-white text-2xl font-bold">C</span>
          </div>
          
          <div>
            <CardTitle className="text-2xl font-bold text-slate-900">Welcome to COMPLYOS</CardTitle>
            <CardDescription className="mt-2">
              Sign in to access your compliance dashboard
            </CardDescription>
          </div>
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-100">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-700">Email address</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="you@company.com" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                className="h-11"
                required 
                disabled={loading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-700">Password</Label>
              <div className="relative">
                <Input 
                  id="password" 
                  type={showPassword ? "text" : "password"} 
                  placeholder="••••••••" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 pr-10"
                  required 
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="flex flex-col gap-3 pt-2">
            <Button 
              type="submit" 
              className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-medium"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
            
            <div className="relative w-full">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-500">or</span>
              </div>
            </div>
            
            <Button 
              type="button" 
              variant="outline"
              className="w-full h-11 border-slate-300 hover:bg-slate-50"
              onClick={handleDemoLogin}
              disabled={loading}
            >
              Try Demo Account
            </Button>
          </CardFooter>
        </form>
        
        <div className="px-6 pb-4 text-center">
          <p className="text-xs text-slate-500">
            Demo credentials: demo@complyos.com / Demo@123
          </p>
        </div>
      </Card>
      
      {/* Footer */}
      <div className="absolute bottom-4 text-center">
        <p className="text-xs text-slate-400">
          © 2026 COMPLYOS. Built for Indian CA firms.
        </p>
      </div>
    </div>
  )
}
