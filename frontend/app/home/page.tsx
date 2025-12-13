"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Mic, CreditCard, PiggyBank, AlertCircle, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { Navigation } from "@/components/navigation"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function HomePage() {
  const router = useRouter()
  const [showAIModal, setShowAIModal] = useState(false)
  const [aiQuery, setAiQuery] = useState("")
  const [showGoalModal, setShowGoalModal] = useState(false)
  const [goalName, setGoalName] = useState("")
  const [goalAmount, setGoalAmount] = useState("")
  const [aiResponse, setAiResponse] = useState("")
  const [showGoalSuccess, setShowGoalSuccess] = useState(false)

  const handleAskAI = () => {
    setShowAIModal(true)
  }

  const handleQuickQuestion = (question: string) => {
    setAiQuery(question)
    setShowAIModal(true)
  }

  const handleSubmitAI = () => {
    const response = `Based on your transaction history, you spent ₦127,500 on food this month, which is within your budget. Great job!`
    setAiResponse(response)
  }

  const handleAddGoal = () => {
    if (goalName && goalAmount) {
      setShowGoalSuccess(true)
      setTimeout(() => {
        setShowGoalModal(false)
        setShowGoalSuccess(false)
        setGoalName("")
        setGoalAmount("")
      }, 2000)
    }
  }

  const handleCloseAIModal = (open: boolean) => {
    setShowAIModal(open)
    if (!open) {
      setAiQuery("")
      setAiResponse("")
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation currentPage="dashboard" />

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-foreground mb-2">Good morning, Adaora! 👋</h1>
          <p className="text-muted-foreground">Here's your financial overview for today</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-border bg-card">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-serif">Financial Health Score</CardTitle>
                  <Badge variant="secondary" className="bg-chart-3/10 text-chart-3 border-chart-3/20">
                    Excellent
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4 mb-4">
                  <div className="text-3xl font-bold text-chart-3">85</div>
                  <div className="flex-1">
                    <Progress value={85} className="h-3" />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Your financial health improved by 12 points this month. Keep up the great work!
                </p>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-4">
              <Card className="border-border bg-card">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Total Balance</span>
                    <CreditCard className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="text-2xl font-bold text-foreground">₦2,847,500</div>
                  <div className="flex items-center text-sm text-chart-3 mt-1">
                    <ArrowUpRight className="w-4 h-4 mr-1" />
                    +12.5% from last month
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Monthly Spending</span>
                    <ArrowDownRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="text-2xl font-bold text-foreground">₦485,200</div>
                  <div className="flex items-center text-sm text-accent mt-1">
                    <ArrowDownRight className="w-4 h-4 mr-1" />
                    -8.2% from last month
                  </div>
                </CardContent>
              </Card>
            </div>

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
                {[
                  { name: "Shoprite Grocery", amount: "-₦45,800", category: "Food & Dining", time: "2 hours ago" },
                  { name: "Salary Deposit", amount: "+₦850,000", category: "Income", time: "Yesterday" },
                  { name: "Uber Ride", amount: "-₦3,200", category: "Transportation", time: "Yesterday" },
                  { name: "Netflix Subscription", amount: "-₦2,900", category: "Entertainment", time: "2 days ago" },
                ].map((transaction, index) => (
                  <div key={index} className="flex items-center justify-between py-2">
                    <div className="flex-1">
                      <div className="font-medium text-foreground">{transaction.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {transaction.category} • {transaction.time}
                      </div>
                    </div>
                    <div
                      className={`font-semibold ${transaction.amount.startsWith("+") ? "text-chart-3" : "text-foreground"}`}
                    >
                      {transaction.amount}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-border bg-card">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-serif flex items-center">
                  <Mic className="w-5 h-5 mr-2 text-primary" />
                  AI Assistant
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button onClick={handleAskAI} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Mic className="w-4 h-4 mr-2" />
                  Ask Finsight AI
                </Button>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Quick Questions:</p>
                  <div className="space-y-1">
                    <button
                      onClick={() => handleQuickQuestion("How much did I spend on food this month?")}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors block text-left"
                    >
                      "How much did I spend on food this month?"
                    </button>
                    <button
                      onClick={() => handleQuickQuestion("Should I increase my savings goal?")}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors block text-left"
                    >
                      "Should I increase my savings goal?"
                    </button>
                    <button
                      onClick={() => handleQuickQuestion("What's my biggest expense category?")}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors block text-left"
                    >
                      "What's my biggest expense category?"
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-serif flex items-center">
                  <PiggyBank className="w-5 h-5 mr-2 text-accent" />
                  Savings Goals
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground">Emergency Fund</span>
                    <span className="text-sm text-muted-foreground">₦180k / ₦500k</span>
                  </div>
                  <Progress value={36} className="h-2" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground">New Car</span>
                    <span className="text-sm text-muted-foreground">₦850k / ₦2M</span>
                  </div>
                  <Progress value={42.5} className="h-2" />
                </div>
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
                    You've spent 85% of your dining budget this month
                  </p>
                </div>
                <div className="p-3 bg-chart-3/10 rounded-lg border border-chart-3/20">
                  <p className="text-sm font-medium text-foreground">Great Job!</p>
                  <p className="text-xs text-muted-foreground mt-1">You saved ₦25,000 more than usual this month</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

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
              Ask me anything about your finances. I can help you understand spending patterns, set budgets, and make
              better financial decisions.
            </p>
            <Input
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              placeholder="Type your question or click the mic to speak..."
              className="bg-muted/50 border-border text-foreground"
            />
            {aiResponse && (
              <Alert className="bg-primary/10 border-primary/20">
                <Mic className="h-4 w-4 text-primary" />
                <AlertTitle className="text-foreground">Finsight AI Response</AlertTitle>
                <AlertDescription className="text-muted-foreground">{aiResponse}</AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleCloseAIModal(false)}>
              {aiResponse ? "Close" : "Cancel"}
            </Button>
            {!aiResponse && (
              <Button onClick={handleSubmitAI} disabled={!aiQuery} className="bg-primary text-primary-foreground">
                <Mic className="w-4 h-4 mr-2" />
                Ask
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showGoalModal} onOpenChange={setShowGoalModal}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center text-foreground">
              <PiggyBank className="w-5 h-5 mr-2 text-accent" />
              Create New Savings Goal
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {showGoalSuccess ? (
              <Alert className="bg-chart-3/10 border-chart-3/20">
                <PiggyBank className="h-4 w-4 text-chart-3" />
                <AlertTitle className="text-foreground">Goal Created Successfully!</AlertTitle>
                <AlertDescription className="text-muted-foreground">
                  Your savings goal "{goalName}" for ₦{goalAmount} has been created. Start saving today to reach your
                  goal faster!
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Goal Name</label>
                  <Input
                    value={goalName}
                    onChange={(e) => setGoalName(e.target.value)}
                    placeholder="e.g., Vacation Fund, New Laptop"
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
              </>
            )}
          </div>
          {!showGoalSuccess && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowGoalModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddGoal} disabled={!goalName || !goalAmount} className="bg-accent text-white">
                Create Goal
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
