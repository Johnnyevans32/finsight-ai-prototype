"use client"

import { useEffect, useId, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Navigation } from "@/components/navigation"
import { Loader2, User, Lock, CheckCircle } from "lucide-react"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { toast } from "sonner"

export default function SettingsPage() {
  const { user, setUser } = useAuth()
  const securityRef = useRef<HTMLDivElement>(null)

  // Profile form
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [savingProfile, setSavingProfile] = useState(false)

  // Password form
  const [oldPassword, setOldPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [savingPassword, setSavingPassword] = useState(false)

  useEffect(() => {
    if (user) {
      setFullName(user.full_name)
      setEmail(user.email)
    }
  }, [user])

  // Scroll to #security anchor on mount if hash present
  useEffect(() => {
    if (window.location.hash === "#security") {
      securityRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [])

  const handleSaveProfile = async () => {
    if (!fullName.trim() || !email.trim()) {
      toast.error("Name and email are required.")
      return
    }
    setSavingProfile(true)
    try {
      const updated = await api.auth.updateMe({ full_name: fullName.trim(), email: email.trim() })
      setUser(updated)
      toast.success("Profile updated.")
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to update profile.")
    } finally {
      setSavingProfile(false)
    }
  }

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      toast.error("All password fields are required.")
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.")
      return
    }
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters.")
      return
    }
    setSavingPassword(true)
    try {
      await api.auth.changePassword(oldPassword, newPassword)
      toast.success("Password changed successfully.")
      setOldPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to change password.")
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation currentPage="settings" />

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-foreground mb-2">Settings</h1>
          <p className="text-muted-foreground">Manage your account preferences and security</p>
        </div>

        <div className="space-y-6">
          {/* Profile */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-lg font-serif flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full name</Label>
                <Input
                  id="full_name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="bg-muted/50 border-border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-muted/50 border-border text-foreground"
                />
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>Member since {user ? new Date(user.date_joined).toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" }) : "—"}</p>
              </div>
              <Button
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="bg-primary text-primary-foreground"
              >
                {savingProfile ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                Save profile
              </Button>
            </CardContent>
          </Card>

          {/* Security */}
          <Card className="border-border bg-card" ref={securityRef} id="security">
            <CardHeader>
              <CardTitle className="text-lg font-serif flex items-center gap-2">
                <Lock className="w-5 h-5 text-primary" />
                Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="old_password">Current password</Label>
                <Input
                  id="old_password"
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="bg-muted/50 border-border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new_password">New password</Label>
                <Input
                  id="new_password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="bg-muted/50 border-border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm_password">Confirm new password</Label>
                <Input
                  id="confirm_password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-muted/50 border-border text-foreground"
                />
              </div>
              <Button
                onClick={handleChangePassword}
                disabled={savingPassword}
                className="bg-primary text-primary-foreground"
              >
                {savingPassword ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Lock className="w-4 h-4 mr-2" />}
                Change password
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
