"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Navigation } from "@/components/navigation"
import { TrendingUp, Mail, Lock, Eye, EyeOff, User, Loader2 } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { toast } from "sonner"

export default function RegisterPage() {
  const { register } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!agreeTerms) {
      toast.error("Please agree to the Terms of Service.")
      return
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.")
      return
    }
    setLoading(true)
    try {
      await register(email, fullName, password)
    } catch (err: any) {
      const detail = err?.data
        ? Object.values(err.data).flat().join(" ")
        : err?.message ?? "Registration failed."
      toast.error(detail)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation showLinks={false} />
      <div className="container mx-auto px-4 py-8 max-w-md flex items-center justify-center min-h-[calc(100vh-80px)]">
        <Card className="w-full border-border bg-card">
          <CardHeader className="pb-6 text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="text-2xl font-serif font-bold text-foreground">Finsight AI</span>
            </div>
            <CardTitle className="text-2xl font-serif">Create Account</CardTitle>
            <p className="text-sm text-muted-foreground mt-2">Join thousands managing their finances smarter</p>
          </CardHeader>
          <CardContent className="space-y-5">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Adaora Okoro"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-10 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="adaora@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">At least 8 characters</p>
              </div>

              <label className="flex items-start space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="w-4 h-4 rounded border-border mt-1"
                />
                <span className="text-xs text-muted-foreground">
                  I agree to the{" "}
                  <Link href="#" className="text-primary hover:text-primary/80">Terms of Service</Link>{" "}
                  and{" "}
                  <Link href="#" className="text-primary hover:text-primary/80">Privacy Policy</Link>
                </span>
              </label>

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-5"
                disabled={!agreeTerms || loading}
              >
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Create Account
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:text-primary/80 transition-colors font-medium">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
