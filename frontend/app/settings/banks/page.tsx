"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Navigation } from "@/components/navigation"
import { Building2, Loader2, Trash2, RefreshCw } from "lucide-react"
import { MonoConnectButton } from "@/components/mono-connect"
import { api, type FinancialAccount, formatCurrency } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export default function ConnectedBanksPage() {
  const { user } = useAuth()
  const [accounts, setAccounts] = useState<FinancialAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)

  const loadAccounts = async () => {
    try {
      const res = await api.accounts.list()
      setAccounts(res.results)
    } catch {
      toast.error("Failed to load accounts.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAccounts() }, [])

  const handleConnect = async (code: string) => {
    setConnecting(true)
    try {
      const account = await api.mono.exchange(code)
      setAccounts((prev) => {
        const exists = prev.find((a) => a.id === account.id)
        return exists ? prev.map((a) => a.id === account.id ? account : a) : [account, ...prev]
      })
      toast.success("Bank account connected.")
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to connect account.")
    } finally {
      setConnecting(false)
    }
  }

  const handleDisconnect = async (id: string) => {
    setDisconnecting(id)
    try {
      await api.accounts.delete(id)
      setAccounts((prev) => prev.filter((a) => a.id !== id))
      toast.success("Account disconnected.")
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to disconnect account.")
    } finally {
      setDisconnecting(null)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation currentPage="settings" />

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-serif font-bold text-foreground mb-2">Connected Banks</h1>
            <p className="text-muted-foreground">Manage your linked bank accounts</p>
          </div>
          <MonoConnectButton
            onSuccess={handleConnect}
            customerName={user?.full_name}
            customerEmail={user?.email}
            loading={connecting}
          />
        </div>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-lg font-serif flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              Linked accounts ({accounts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : accounts.length === 0 ? (
              <div className="p-8 text-center">
                <Building2 className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p className="text-muted-foreground">No bank accounts connected yet.</p>
                <p className="text-sm text-muted-foreground mt-1">Use the button above to link your first account.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {accounts.map((account) => (
                  <div key={account.id} className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{account.institution_name}</p>
                        <p className="text-sm text-muted-foreground capitalize">
                          {account.account_type} · {account.currency} · {formatCurrency(account.balance_current_minor)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={loadAccounts}
                        title="Refresh"
                      >
                        <RefreshCw className="w-4 h-4 text-muted-foreground" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" title="Disconnect">
                            {disconnecting === account.id
                              ? <Loader2 className="w-4 h-4 animate-spin text-destructive" />
                              : <Trash2 className="w-4 h-4 text-destructive" />}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Disconnect {account.institution_name}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove the account and all its transaction history from Finsight. You can reconnect it at any time.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => handleDisconnect(account.id)}
                            >
                              Disconnect
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
