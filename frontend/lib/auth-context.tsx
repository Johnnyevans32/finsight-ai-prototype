"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { useRouter, usePathname } from "next/navigation"
import { api, type User } from "./api"

interface AuthCtx {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, full_name: string, password: string) => Promise<void>
  logout: () => Promise<void>
  setUser: (user: User) => void
}

const AuthContext = createContext<AuthCtx | null>(null)

const PUBLIC = new Set(["/", "/login", "/register"])

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    api.auth
      .me()
      .then(setUser)
      .catch(() => {
        setUser(null)
        if (!PUBLIC.has(pathname)) router.replace("/login")
      })
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const login = async (email: string, password: string) => {
    const u = await api.auth.login(email, password)
    setUser(u)
    router.push("/home")
  }

  const register = async (email: string, full_name: string, password: string) => {
    await api.auth.register(email, full_name, password)
    const u = await api.auth.login(email, password)
    setUser(u)
    router.push("/home")
  }

  const logout = async () => {
    await api.auth.logout()
    setUser(null)
    router.push("/login")
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
