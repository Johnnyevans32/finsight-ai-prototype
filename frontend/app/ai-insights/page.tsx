"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Navigation } from "@/components/navigation"
import {
  TrendingUp,
  TrendingDown,
  Eye,
  Shield,
  Zap,
  Target,
  AlertCircle,
  CheckCircle,
  Clock,
  BarChart3,
  PiggyBank,
  Wallet,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react"
import { api, formatCurrency } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { toast } from "sonner"

interface AIInsights {
  financial_health_score: number
  risk_level: "low" | "moderate" | "high" | "critical"
  future_predictions: {
    balance_3_months: number
    balance_6_months: number
    balance_12_months: number
  }
  spending_insights: {
    biggest_expense_category: string
    spending_trend: "increasing" | "stable" | "decreasing"
    monthly_burn_rate: number
  }
  smart_alerts: Array<{
    type: "warning" | "opportunity" | "danger" | "success"
    message: string
    priority: "low" | "medium" | "high" | "urgent"
  }>
  investment_opportunities: string[]
  financial_stress_indicators: {
    stress_level: "minimal" | "low" | "moderate" | "high" | "severe"
    key_stressors: string[]
  }
  actionable_recommendations: string[]
  analysis_timestamp: string
  data_points_analyzed: {
    accounts: number
    transactions: number
    time_period_days: number
    goals: number
  }
}

export default function AIInsightsPage() {
  const { user } = useAuth()
  const [insights, setInsights] = useState<AIInsights | null>(null)
  const [loading, setLoading] = useState(false)

  const loadInsights = async () => {
    setLoading(true)
    try {
      const result = await api.ai.financialIntelligence()
      setInsights(result)
      toast.success("Analysis complete!")
    } catch (err: any) {
      toast.error(err?.message ?? "Analysis failed")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      loadInsights()
    }
  }, [user])

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return "from-emerald-500 to-green-600"
    if (score >= 60) return "from-blue-500 to-indigo-600"
    if (score >= 40) return "from-yellow-500 to-orange-600"
    return "from-red-500 to-pink-600"
  }

  const getHealthScoreIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="w-5 h-5 text-emerald-600" />
    if (score >= 60) return <Eye className="w-5 h-5 text-blue-600" />
    if (score >= 40) return <AlertCircle className="w-5 h-5 text-yellow-600" />
    return <AlertCircle className="w-5 h-5 text-red-600" />
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "increasing": return <TrendingUp className="w-4 h-4 text-red-500" />
      case "decreasing": return <TrendingDown className="w-4 h-4 text-green-500" />
      default: return <BarChart3 className="w-4 h-4 text-gray-500" />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation currentPage="ai-insights" />

      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Hero Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Financial Intelligence</h1>
              <p className="text-gray-600">AI-powered insights to optimize your financial future</p>
            </div>
            <Button
              onClick={loadInsights}
              disabled={loading}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Refresh Analysis
                </>
              )}
            </Button>
          </div>
        </div>

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="animate-pulse border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                  <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {insights && !loading && (
          <div className="space-y-8">
            {/* Key Metrics Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Health Score */}
              <Card className="border-0 shadow-xl bg-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      {getHealthScoreIcon(insights.financial_health_score)}
                      <span className="text-sm font-medium text-gray-600">Health Score</span>
                    </div>
                    <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${getHealthScoreColor(insights.financial_health_score)}`}></div>
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mb-2">{insights.financial_health_score}</div>
                  <div className="text-sm text-gray-500">Out of 100</div>
                </CardContent>
              </Card>

              {/* Risk Level */}
              <Card className="border-0 shadow-xl bg-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <Shield className="w-5 h-5 text-gray-600" />
                      <span className="text-sm font-medium text-gray-600">Risk Level</span>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-2 capitalize">{insights.risk_level}</div>
                  <div className="text-sm text-gray-500">Current assessment</div>
                </CardContent>
              </Card>

              {/* Spending Trend */}
              <Card className="border-0 shadow-xl bg-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      {getTrendIcon(insights.spending_insights.spending_trend)}
                      <span className="text-sm font-medium text-gray-600">Spending</span>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-2 capitalize">{insights.spending_insights.spending_trend}</div>
                  <div className="text-sm text-gray-500">{formatCurrency(insights.spending_insights.monthly_burn_rate)} monthly</div>
                </CardContent>
              </Card>

              {/* Data Points */}
              <Card className="border-0 shadow-xl bg-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <BarChart3 className="w-5 h-5 text-gray-600" />
                      <span className="text-sm font-medium text-gray-600">Data Points</span>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-2">{insights.data_points_analyzed.transactions}</div>
                  <div className="text-sm text-gray-500">Transactions analyzed</div>
                </CardContent>
              </Card>
            </div>

            {/* Balance Predictions */}
            <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-50 to-indigo-100">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-gray-900">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                  <span>Balance Forecast</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-600">3 Months</span>
                      <Clock className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {formatCurrency(insights.future_predictions.balance_3_months)}
                    </div>
                    <div className="flex items-center mt-2 text-sm">
                      <ArrowUpRight className="w-4 h-4 text-green-500 mr-1" />
                      <span className="text-green-600">Projected growth</span>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-600">6 Months</span>
                      <Clock className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {formatCurrency(insights.future_predictions.balance_6_months)}
                    </div>
                    <div className="flex items-center mt-2 text-sm">
                      <ArrowUpRight className="w-4 h-4 text-blue-500 mr-1" />
                      <span className="text-blue-600">Mid-term outlook</span>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-600">12 Months</span>
                      <Clock className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {formatCurrency(insights.future_predictions.balance_12_months)}
                    </div>
                    <div className="flex items-center mt-2 text-sm">
                      <ArrowUpRight className="w-4 h-4 text-purple-500 mr-1" />
                      <span className="text-purple-600">Long-term goal</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Insights Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Smart Alerts */}
              <Card className="border-0 shadow-xl bg-white">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-gray-900">
                    <Zap className="w-6 h-6 text-yellow-600" />
                    <span>Smart Alerts</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {insights.smart_alerts.map((alert, index) => (
                    <div key={index} className="flex items-start space-x-3 p-4 rounded-lg border border-gray-100 bg-gray-50">
                      <div className={`w-2 h-2 rounded-full mt-2 ${
                        alert.type === 'warning' ? 'bg-yellow-500' :
                        alert.type === 'danger' ? 'bg-red-500' :
                        alert.type === 'opportunity' ? 'bg-green-500' : 'bg-blue-500'
                      }`}></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{alert.message}</p>
                        <p className="text-xs text-gray-500 mt-1">Priority: {alert.priority}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Investment Opportunities */}
              <Card className="border-0 shadow-xl bg-gradient-to-br from-green-50 to-emerald-100">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-gray-900">
                    <Target className="w-6 h-6 text-green-600" />
                    <span>Investment Ideas</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {insights.investment_opportunities.map((opportunity, index) => (
                    <div key={index} className="flex items-center space-x-3 p-3 bg-white rounded-lg shadow-sm">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <PiggyBank className="w-4 h-4 text-green-600" />
                      </div>
                      <span className="text-sm font-medium text-gray-900">{opportunity}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Bottom Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Spending Analysis */}
              <Card className="border-0 shadow-xl bg-white">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-gray-900">
                    <Wallet className="w-6 h-6 text-indigo-600" />
                    <span>Spending Analysis</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Top Category</span>
                    <span className="font-semibold text-gray-900">{insights.spending_insights.biggest_expense_category}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Monthly Burn</span>
                    <span className="font-semibold text-red-600">{formatCurrency(insights.spending_insights.monthly_burn_rate)}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Trend</span>
                    <div className="flex items-center space-x-1">
                      {getTrendIcon(insights.spending_insights.spending_trend)}
                      <span className="font-semibold text-gray-900 capitalize">{insights.spending_insights.spending_trend}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Action Items */}
              <Card className="border-0 shadow-xl bg-gradient-to-br from-purple-50 to-pink-100">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-gray-900">
                    <CheckCircle className="w-6 h-6 text-purple-600" />
                    <span>Next Steps</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {insights.actionable_recommendations.map((recommendation, index) => (
                    <div key={index} className="flex items-center space-x-3 p-3 bg-white rounded-lg shadow-sm">
                      <div className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                        {index + 1}
                      </div>
                      <span className="text-sm text-gray-900 flex-1">{recommendation}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Footer */}
            <div className="text-center py-6">
              <p className="text-sm text-gray-500">
                Last analyzed {new Date(insights.analysis_timestamp).toLocaleDateString()} •
                Based on {insights.data_points_analyzed.time_period_days} days of data
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}