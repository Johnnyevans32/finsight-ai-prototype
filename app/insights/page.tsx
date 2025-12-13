"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Navigation } from "@/components/navigation"
import { TrendingUp, TrendingDown, PieChart, Target, AlertCircle, Lightbulb } from "lucide-react"

export default function InsightsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation currentPage="insights" />

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-foreground mb-2">Financial Insights</h1>
          <p className="text-muted-foreground">AI-powered analysis of your spending patterns and financial health</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Spending Overview */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-lg font-serif flex items-center">
                  <PieChart className="w-5 h-5 mr-2 text-primary" />
                  Spending by Category
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  {[
                    { category: "Food & Dining", amount: "₦145,200", percentage: 35, color: "bg-chart-1" },
                    { category: "Transportation", amount: "₦65,800", percentage: 16, color: "bg-chart-2" },
                    { category: "Entertainment", amount: "₦52,400", percentage: 13, color: "bg-chart-3" },
                    { category: "Utilities", amount: "₦58,900", percentage: 14, color: "bg-chart-4" },
                    { category: "Health & Wellness", amount: "₦48,500", percentage: 12, color: "bg-chart-5" },
                    { category: "Other", amount: "₦32,000", percentage: 10, color: "bg-muted" },
                  ].map((item, index) => (
                    <div key={index}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-foreground">{item.category}</span>
                        <div className="text-right">
                          <div className="font-semibold text-foreground">{item.amount}</div>
                          <div className="text-xs text-muted-foreground">{item.percentage}%</div>
                        </div>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                        <div className={`${item.color} h-full`} style={{ width: `${item.percentage}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Spending Trends */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-lg font-serif flex items-center">
                  <TrendingDown className="w-5 h-5 mr-2 text-accent" />
                  Monthly Spending Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { month: "August", amount: "₦520,000", trend: "up", change: "+5.2%" },
                    { month: "September", amount: "₦485,200", trend: "down", change: "-6.7%" },
                    { month: "October", amount: "₦510,500", trend: "up", change: "+5.2%" },
                    { month: "November", amount: "₦415,800", trend: "down", change: "-18.5%" },
                  ].map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div>
                        <div className="font-medium text-foreground">{item.month}</div>
                        <div className="text-sm text-muted-foreground">{item.amount}</div>
                      </div>
                      <div
                        className={`flex items-center gap-1 ${item.trend === "down" ? "text-chart-3" : "text-accent"}`}
                      >
                        {item.trend === "down" ? (
                          <TrendingDown className="w-4 h-4" />
                        ) : (
                          <TrendingUp className="w-4 h-4" />
                        )}
                        <span className="text-sm font-semibold">{item.change}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Comparisons */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-lg font-serif">Month-to-Month Comparison</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">This Month vs Last Month</div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold text-foreground">-18.5%</span>
                      <Badge className="bg-chart-3/10 text-chart-3 border-chart-3/20">Excellent</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">You spent ₦104,700 less than October</p>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Highest Spending Month</div>
                    <div>
                      <span className="text-lg font-bold text-foreground">August</span>
                      <span className="text-sm text-muted-foreground ml-2">(₦520,000)</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">Current month is 20% better</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* AI Recommendations */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-lg font-serif flex items-center">
                  <Lightbulb className="w-5 h-5 mr-2 text-primary" />
                  AI Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                  <p className="text-sm font-medium text-foreground">Reduce Dining Out</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    You can save ₦35,000/month by cooking at home 3 more days weekly
                  </p>
                </div>
                <div className="p-3 bg-accent/10 rounded-lg border border-accent/20">
                  <p className="text-sm font-medium text-foreground">Subscription Audit</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    You're spending ₦6,200/month on 2 unused streaming services
                  </p>
                </div>
                <div className="p-3 bg-chart-3/10 rounded-lg border border-chart-3/20">
                  <p className="text-sm font-medium text-foreground">Increase Savings</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Great job! You saved ₦25,000 extra this month. Keep it up! 🎉
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Spending Goals */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-lg font-serif flex items-center">
                  <Target className="w-5 h-5 mr-2 text-accent" />
                  Budget Goals
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground">Monthly Budget</span>
                    <span className="text-sm font-semibold text-foreground">85%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div className="bg-accent h-full" style={{ width: "85%" }}></div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">₦415,800 / ₦500,000</p>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground">Savings Goal</span>
                    <span className="text-sm font-semibold text-chart-3">42%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div className="bg-chart-3 h-full" style={{ width: "42%" }}></div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">₦210,000 / ₦500,000</p>
                </div>
              </CardContent>
            </Card>

            {/* Alerts & Warnings */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-lg font-serif flex items-center">
                  <AlertCircle className="w-5 h-5 mr-2 text-accent" />
                  Alerts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="p-3 bg-accent/10 rounded-lg border border-accent/20">
                  <p className="text-xs font-medium text-foreground">Unusual Spending</p>
                  <p className="text-xs text-muted-foreground mt-1">Large purchase detected on Dec 2</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
