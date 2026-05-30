"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Mic, CreditCard, PiggyBank, AlertCircle, ArrowDownRight, Loader2 } from "lucide-react"
import { Navigation } from "@/components/navigation"
import { MonoConnectButton } from "@/components/mono-connect"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useAuth } from "@/lib/auth-context"
import {
  api,
  type FinancialAccount,
  type Transaction,
  type SavingsGoal,
  formatCurrency,
  formatRelativeTime,
  isDebit,
  getFirstName,
} from "@/lib/api"
import { toast } from "sonner"

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return "Good morning"
  if (h < 17) return "Good afternoon"
  return "Good evening"
}

export default function HomePage() {
  const router = useRouter()
  const { user } = useAuth()

  // Data state
  const [accounts, setAccounts] = useState<FinancialAccount[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]) // Store ALL for calculations
  const [goals, setGoals] = useState<SavingsGoal[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [connectingBank, setConnectingBank] = useState(false)

  // Modal state
  const [showAIModal, setShowAIModal] = useState(false)
  const [aiQuery, setAiQuery] = useState("")
  const [aiResponse, setAiResponse] = useState("")
  const [aiTips, setAiTips] = useState<string[]>([])
  const [aiLoading, setAiLoading] = useState(false)
  const [showGoalModal, setShowGoalModal] = useState(false)
  const [goalName, setGoalName] = useState("")
  const [goalAmount, setGoalAmount] = useState("")
  const [savingGoal, setSavingGoal] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const [acctRes, allTxnRes, goalRes] = await Promise.all([
        api.accounts.list(),
        api.transactions.list({ no_page: true }), // Get ALL transactions for accurate calculations
        api.goals.list(),
      ])
      setAccounts(acctRes.results)
      const allTxnsData = Array.isArray(allTxnRes) ? allTxnRes : allTxnRes.results
      setAllTransactions(allTxnsData) // Store ALL transactions for calculations
      setTransactions(allTxnsData.slice(0, 5)) // Display only recent 5
      setGoals(goalRes.results)
    } catch {
      toast.error("Failed to load data.")
    } finally {
      setDataLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance_current_minor, 0)

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const monthlySpend = allTransactions
    .filter((t) => isDebit(t.amount_minor) && t.booked_at >= monthStart)
    .reduce((sum, t) => sum + Math.abs(t.amount_minor), 0)

  const handleMonoSuccess = async (code: string) => {
    setConnectingBank(true)
    try {
      await api.mono.exchange(code)
      toast.success("Bank account connected! Syncing transactions…")
      await loadData()
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to connect bank account.")
    } finally {
      setConnectingBank(false)
    }
  }

  const handleSubmitAI = async () => {
    if (!aiQuery.trim()) return
    setAiLoading(true)
    try {
      const { response, tips } = await api.ai.chat(aiQuery)
      setAiResponse(response)
      setAiTips(tips ?? [])
    } catch {
      toast.error("AI request failed. Please try again.")
    } finally {
      setAiLoading(false)
    }
  }

  const handleCloseAIModal = (open: boolean) => {
    setShowAIModal(open)
    if (!open) { setAiQuery(""); setAiResponse(""); setAiTips([]) }
  }

  const handleAddGoal = async () => {
    if (!goalName || !goalAmount) return
    setSavingGoal(true)
    try {
      const created = await api.goals.create({
        name: goalName,
        target_minor: Math.round(parseFloat(goalAmount) * 100),
      })
      setGoals((prev) => [...prev, created])
      toast.success(`Goal "${goalName}" created!`)
      setShowGoalModal(false)
      setGoalName("")
      setGoalAmount("")
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to create goal.")
    } finally {
      setSavingGoal(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation currentPage="dashboard" />

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-foreground mb-2">
            {getGreeting()}, {getFirstName(user?.full_name ?? "")}!
          </h1>
          <p className="text-muted-foreground">Here's your financial overview for today</p>
        </div>

        {dataLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Connect bank CTA if no accounts */}
              {accounts.length === 0 && (
                <Card className="border-dashed border-2 border-border bg-card">
                  <CardContent className="p-8 text-center space-y-4">
                    <CreditCard className="w-12 h-12 text-muted-foreground mx-auto" />
                    <div>
                      <h3 className="font-serif font-semibold text-foreground text-lg">Connect your bank account</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Link your Nigerian bank to see real balances, transactions and AI insights.
                      </p>
                    </div>
                    <MonoConnectButton
                      onSuccess={handleMonoSuccess}
                      customerName={user?.full_name}
                      customerEmail={user?.email}
                      loading={connectingBank}
                      className="mx-auto"
                    />
                  </CardContent>
                </Card>
              )}

              {/* Summary cards */}
              <div className="grid md:grid-cols-2 gap-4">
                <Card className="border-border bg-card">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Total Balance</span>
                      <CreditCard className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="text-2xl font-bold text-foreground">
                      {accounts.length > 0 ? formatCurrency(totalBalance) : "—"}
                    </div>
                    {accounts.length > 0 && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Across {accounts.length} account{accounts.length > 1 ? "s" : ""}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-border bg-card">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Monthly Spending</span>
                      <ArrowDownRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="text-2xl font-bold text-foreground">
                      {transactions.length > 0 ? formatCurrency(monthlySpend) : "—"}
                    </div>
                    {transactions.length > 0 && (
                      <div className="text-xs text-muted-foreground mt-1">This month</div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Recent Transactions */}
              <Card className="border-border bg-card">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-serif">Recent Transactions</CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => router.push("/transactions")}>
                      View All
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {transactions.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {accounts.length === 0 ? "Connect a bank account to see transactions." : "No transactions yet."}
                    </p>
                  ) : (
                    transactions.map((txn) => (
                      <div key={txn.id} className="flex items-center justify-between py-2">
                        <div className="flex-1">
                          <div className="font-medium text-foreground">{txn.merchant_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {txn.category_name ?? "Uncategorized"} • {formatRelativeTime(txn.booked_at)}
                          </div>
                        </div>
                        <div className={`font-semibold ${isDebit(txn.amount_minor) ? "text-foreground" : "text-chart-3"}`}>
                          {isDebit(txn.amount_minor) ? "-" : "+"}{formatCurrency(txn.amount_minor)}
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* AI Assistant */}
              <Card className="border-border bg-card">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-serif flex items-center">
                    <Mic className="w-5 h-5 mr-2 text-primary" />
                    AI Assistant
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button onClick={() => setShowAIModal(true)} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                    <Mic className="w-4 h-4 mr-2" />
                    Ask Finsight AI
                  </Button>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Quick Questions:</p>
                    <div className="space-y-1">
                      {[
                        "How much did I spend on food this month?",
                        "What's my biggest expense category?",
                        "Should I increase my savings goal?",
                      ].map((q) => (
                        <button
                          key={q}
                          onClick={() => { setAiQuery(q); setShowAIModal(true) }}
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors block text-left"
                        >
                          "{q}"
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Connect Bank (sidebar — shown when accounts exist) */}
              {accounts.length > 0 && (
                <Card className="border-border bg-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-serif flex items-center">
                      <CreditCard className="w-4 h-4 mr-2 text-primary" />
                      Connected Banks
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {accounts.map((a) => (
                      <div key={a.id} className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">{a.institution_name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{a.account_type}</p>
                        </div>
                        <p className="text-sm font-semibold text-foreground">{formatCurrency(a.balance_current_minor)}</p>
                      </div>
                    ))}
                    <MonoConnectButton
                      onSuccess={handleMonoSuccess}
                      customerName={user?.full_name}
                      customerEmail={user?.email}
                      loading={connectingBank}
                      className="w-full mt-2"
                    />
                  </CardContent>
                </Card>
              )}

              {/* Savings Goals */}
              <Card className="border-border bg-card">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-serif flex items-center">
                    <PiggyBank className="w-5 h-5 mr-2 text-accent" />
                    Savings Goals
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {goals.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No goals yet. Create one below!</p>
                  ) : (
                    goals.slice(0, 3).map((goal) => (
                      <div key={goal.id}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-foreground">{goal.name}</span>
                          <span className="text-sm text-muted-foreground">
                            {formatCurrency(goal.current_minor)} / {formatCurrency(goal.target_minor)}
                          </span>
                        </div>
                        <Progress value={goal.progress_percent} className="h-2" />
                      </div>
                    ))
                  )}
                  <Button
                    onClick={() => setShowGoalModal(true)}
                    variant="outline"
                    size="sm"
                    className="w-full bg-transparent"
                  >
                    Add New Goal
                  </Button>
                </CardContent>
              </Card>

              {/* Smart Alerts */}
              <Card className="border-border bg-card">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-serif flex items-center">
                    <AlertCircle className="w-5 h-5 mr-2 text-accent" />
                    Smart Alerts
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 bg-accent/10 rounded-lg border border-accent/20">
                    <p className="text-sm font-medium text-foreground">Budget Alert</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {transactions.length > 0
                        ? `You've spent ${formatCurrency(monthlySpend)} so far this month.`
                        : "Connect a bank to see spending alerts."}
                    </p>
                  </div>
                  {goals.some((g) => g.progress_percent >= 50) && (
                    <div className="p-3 bg-chart-3/10 rounded-lg border border-chart-3/20">
                      <p className="text-sm font-medium text-foreground">Great Progress!</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        You're over halfway to{" "}
                        {goals.find((g) => g.progress_percent >= 50)?.name}. Keep it up!
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* AI Modal */}
      <Dialog open={showAIModal} onOpenChange={handleCloseAIModal}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center text-foreground">
              <Mic className="w-5 h-5 mr-2 text-primary" />
              Ask Finsight AI
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Ask me anything about your finances. I can help you understand spending patterns, set budgets, and make better financial decisions.
            </p>
            <Input
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !aiLoading && handleSubmitAI()}
              placeholder="e.g. How much did I spend on food?"
              className="bg-muted/50 border-border text-foreground"
            />
            {aiResponse && (
              <Alert className="bg-primary/10 border-primary/20">
                <Mic className="h-4 w-4 text-primary" />
                <AlertTitle className="text-foreground">Finsight AI</AlertTitle>
                <AlertDescription className="text-muted-foreground space-y-2">
                  <p>{aiResponse}</p>
                  {aiTips.length > 0 && (
                    <ul className="mt-2 space-y-1 list-none">
                      {aiTips.map((tip, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs">
                          <span className="mt-0.5 shrink-0 text-primary">•</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleCloseAIModal(false)}>
              {aiResponse ? "Close" : "Cancel"}
            </Button>
            {!aiResponse && (
              <Button onClick={handleSubmitAI} disabled={!aiQuery || aiLoading} className="bg-primary text-primary-foreground">
                {aiLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mic className="w-4 h-4 mr-2" />}
                {aiLoading ? "Thinking…" : "Ask"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Goal Modal */}
      <Dialog open={showGoalModal} onOpenChange={setShowGoalModal}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center text-foreground">
              <PiggyBank className="w-5 h-5 mr-2 text-accent" />
              Create New Savings Goal
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Goal Name</label>
              <Input
                value={goalName}
                onChange={(e) => setGoalName(e.target.value)}
                placeholder="e.g. Vacation Fund, New Laptop"
                className="bg-muted/50 border-border text-foreground"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Target Amount (₦)</label>
              <Input
                type="number"
                value={goalAmount}
                onChange={(e) => setGoalAmount(e.target.value)}
                placeholder="500000"
                className="bg-muted/50 border-border text-foreground"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGoalModal(false)}>Cancel</Button>
            <Button
              onClick={handleAddGoal}
              disabled={!goalName || !goalAmount || savingGoal}
              className="bg-accent text-white"
            >
              {savingGoal && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Goal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
