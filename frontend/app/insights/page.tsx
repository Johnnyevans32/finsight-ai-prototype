"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Navigation } from "@/components/navigation"
import { TrendingUp, TrendingDown, PieChart, Target, AlertCircle, Lightbulb, Loader2 } from "lucide-react"
import { api, type Transaction, type SavingsGoal, formatCurrency, isDebit } from "@/lib/api"
import { toast } from "sonner"

interface CategorySpend {
  name: string
  amount: number
  percentage: number
  color: string
}

interface MonthlyTrend {
  month: string
  amount: number
  trend: "up" | "down"
  change: string
}

const CHART_COLORS = ["bg-chart-1", "bg-chart-2", "bg-chart-3", "bg-chart-4", "bg-chart-5", "bg-muted"]

function getMonthLabel(date: Date) {
  return date.toLocaleDateString("en-NG", { month: "long" })
}

export default function InsightsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [goals, setGoals] = useState<SavingsGoal[]>([])
  const [loading, setLoading] = useState(true)
  const [aiAnswer, setAiAnswer] = useState("")
  const [aiTips, setAiTips] = useState<string[]>([])
  const [aiLoading, setAiLoading] = useState(false)

  const fetchAiRecommendations = async () => {
    setAiLoading(true)
    try {
      const { response, tips } = await api.ai.chat(
        "Analyse my spending patterns this month and give me 3 personalised tips to improve my financial health."
      )
      setAiAnswer(response)
      setAiTips(tips ?? [])
    } catch {
      // silently fail — user can retry manually
    } finally {
      setAiLoading(false)
    }
  }

  useEffect(() => {
    Promise.all([
      api.transactions.list({ no_page: true }),
      api.goals.list(),
    ])
      .then(([txnRes, goalRes]) => {
        const txns = Array.isArray(txnRes) ? txnRes : (txnRes as import("@/lib/api").Paginated<import("@/lib/api").Transaction>).results
        setTransactions(txns)
        setGoals(goalRes.results)
      })
      .catch(() => toast.error("Failed to load insights."))
      .finally(() => {
        setLoading(false)
        fetchAiRecommendations()
      })
  }, [])

  // Spending by category (expenses only, current month)
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthlyExpenses = transactions.filter(
    (t) => isDebit(t.amount_minor) && new Date(t.booked_at) >= monthStart
  )
  const totalMonthSpend = monthlyExpenses.reduce((s, t) => s + Math.abs(t.amount_minor), 0)

  const categoryMap: Record<string, number> = {}
  for (const t of monthlyExpenses) {
    const cat = t.category_name ?? "Other"
    categoryMap[cat] = (categoryMap[cat] ?? 0) + Math.abs(t.amount_minor)
  }
  const categorySpends: CategorySpend[] = Object.entries(categoryMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, amount], i) => ({
      name,
      amount,
      percentage: totalMonthSpend > 0 ? Math.round((amount / totalMonthSpend) * 100) : 0,
      color: CHART_COLORS[i] ?? "bg-muted",
    }))

  // Monthly trends — last 4 months
  const trends: MonthlyTrend[] = []
  for (let i = 3; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
    const spend = transactions
      .filter((t) => isDebit(t.amount_minor) && new Date(t.booked_at) >= d && new Date(t.booked_at) < end)
      .reduce((s, t) => s + Math.abs(t.amount_minor), 0)
    trends.push({ month: getMonthLabel(d), amount: spend, trend: "up", change: "" })
  }
  for (let i = 1; i < trends.length; i++) {
    const prev = trends[i - 1].amount
    const curr = trends[i].amount
    if (prev === 0) {
      trends[i].trend = "up"
      trends[i].change = "—"
    } else {
      const pct = ((curr - prev) / prev) * 100
      trends[i].trend = pct <= 0 ? "down" : "up"
      trends[i].change = `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`
    }
  }
  trends[0].change = "—"
  trends[0].trend = "up"

  const thisMonth = trends[trends.length - 1]
  const lastMonth = trends[trends.length - 2]
  const momChange = lastMonth?.amount > 0
    ? (((thisMonth.amount - lastMonth.amount) / lastMonth.amount) * 100).toFixed(1)
    : null

  const peakMonth = [...trends].sort((a, b) => b.amount - a.amount)[0]

  // Budget: first active goal as proxy
  const firstGoal = goals[0]
  const totalGoalTarget = goals.reduce((s, g) => s + g.target_minor, 0)
  const totalGoalCurrent = goals.reduce((s, g) => s + g.current_minor, 0)
  const overallGoalPct = totalGoalTarget > 0 ? Math.round((totalGoalCurrent / totalGoalTarget) * 100) : 0

  return (
    <div className="min-h-screen bg-background">
      <Navigation currentPage="insights" />

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-foreground mb-2">Financial Insights</h1>
          <p className="text-muted-foreground">AI-powered analysis of your spending patterns and financial health</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <PieChart className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">No data yet</p>
            <p className="text-sm mt-1">Connect a bank account from the dashboard to see insights.</p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main */}
            <div className="lg:col-span-2 space-y-6">
              {/* Spending by category */}
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="text-lg font-serif flex items-center">
                    <PieChart className="w-5 h-5 mr-2 text-primary" />
                    Spending by Category — This Month
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {categorySpends.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No expenses recorded this month.</p>
                  ) : (
                    categorySpends.map((item) => (
                      <div key={item.name}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-foreground">{item.name}</span>
                          <div className="text-right">
                            <div className="font-semibold text-foreground">{formatCurrency(item.amount)}</div>
                            <div className="text-xs text-muted-foreground">{item.percentage}%</div>
                          </div>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                          <div className={`${item.color} h-full`} style={{ width: `${item.percentage}%` }} />
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* Monthly trends */}
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="text-lg font-serif flex items-center">
                    <TrendingDown className="w-5 h-5 mr-2 text-accent" />
                    Monthly Spending Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {trends.map((item) => (
                      <div key={item.month} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <div>
                          <div className="font-medium text-foreground">{item.month}</div>
                          <div className="text-sm text-muted-foreground">{formatCurrency(item.amount)}</div>
                        </div>
                        {item.change && item.change !== "—" && (
                          <div className={`flex items-center gap-1 ${item.trend === "down" ? "text-chart-3" : "text-accent"}`}>
                            {item.trend === "down" ? (
                              <TrendingDown className="w-4 h-4" />
                            ) : (
                              <TrendingUp className="w-4 h-4" />
                            )}
                            <span className="text-sm font-semibold">{item.change}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Month comparison */}
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="text-lg font-serif">Month-to-Month Comparison</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <div className="text-sm text-muted-foreground mb-1">This Month vs Last Month</div>
                      {momChange !== null ? (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-bold text-foreground">{momChange}%</span>
                            <Badge className={parseFloat(momChange) <= 0 ? "bg-chart-3/10 text-chart-3 border-chart-3/20" : "bg-accent/10 text-accent border-accent/20"}>
                              {parseFloat(momChange) <= 0 ? "Better" : "Higher"}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            {parseFloat(momChange) < 0
                              ? `You spent ${formatCurrency(Math.abs(thisMonth.amount - lastMonth.amount))} less than last month`
                              : `You spent ${formatCurrency(Math.abs(thisMonth.amount - lastMonth.amount))} more than last month`}
                          </p>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">Not enough data yet.</p>
                      )}
                    </div>
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <div className="text-sm text-muted-foreground mb-1">Highest Spending Month</div>
                      {peakMonth?.amount > 0 ? (
                        <>
                          <span className="text-lg font-bold text-foreground">{peakMonth.month}</span>
                          <span className="text-sm text-muted-foreground ml-2">({formatCurrency(peakMonth.amount)})</span>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">Not enough data.</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* AI Recommendations */}
              <Card className="border-border bg-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-lg font-serif flex items-center">
                    <Lightbulb className="w-5 h-5 mr-2 text-primary" />
                    AI Recommendations
                  </CardTitle>
                  <button
                    onClick={fetchAiRecommendations}
                    disabled={aiLoading}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                  >
                    {aiLoading ? "Thinking…" : "Refresh"}
                  </button>
                </CardHeader>
                <CardContent className="space-y-3">
                  {aiLoading ? (
                    <div className="flex items-center gap-2 py-4 justify-center">
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Analysing your finances…</span>
                    </div>
                  ) : aiAnswer ? (
                    <>
                      <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                        <p className="text-sm text-foreground">{aiAnswer}</p>
                      </div>
                      {aiTips.map((tip, i) => (
                        <div key={i} className="p-3 bg-muted/40 rounded-lg border border-border flex items-start gap-2">
                          <span className="text-primary font-bold text-sm shrink-0">{i + 1}.</span>
                          <p className="text-xs text-muted-foreground">{tip}</p>
                        </div>
                      ))}
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground py-2">Could not load AI recommendations. Click Refresh to try again.</p>
                  )}
                </CardContent>
              </Card>

              {/* Savings Goals summary */}
              {goals.length > 0 && (
                <Card className="border-border bg-card">
                  <CardHeader>
                    <CardTitle className="text-lg font-serif flex items-center">
                      <Target className="w-5 h-5 mr-2 text-accent" />
                      Savings Goals
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {goals.slice(0, 3).map((g) => (
                      <div key={g.id}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-foreground">{g.name}</span>
                          <span className="text-sm font-semibold text-foreground">{g.progress_percent}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                          <div className="bg-chart-3 h-full" style={{ width: `${g.progress_percent}%` }} />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatCurrency(g.current_minor)} / {formatCurrency(g.target_minor)}
                        </p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Alerts */}
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="text-lg font-serif flex items-center">
                    <AlertCircle className="w-5 h-5 mr-2 text-accent" />
                    Alerts
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {categorySpends[0] && categorySpends[0].percentage > 40 && (
                    <div className="p-3 bg-accent/10 rounded-lg border border-accent/20">
                      <p className="text-xs font-medium text-foreground">High concentration in {categorySpends[0].name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {categorySpends[0].percentage}% of spending in one category is quite high.
                      </p>
                    </div>
                  )}
                  {transactions.length > 0 && totalMonthSpend === 0 && (
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <p className="text-xs font-medium text-foreground">No expenses this month</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Transactions may still be syncing from your bank.
                      </p>
                    </div>
                  )}
                  {categorySpends.length === 0 && (
                    <p className="text-xs text-muted-foreground">No alerts for this month.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
