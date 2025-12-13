"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Navigation } from "@/components/navigation"
import { ArrowUpRight, ArrowDownRight, Search, Filter, Download, Calendar } from "lucide-react"
import { useState } from "react"

const allTransactions = [
  {
    id: 1,
    name: "Shoprite Grocery",
    amount: "-₦45,800",
    category: "Food & Dining",
    time: "2 hours ago",
    status: "completed",
  },
  { id: 2, name: "Salary Deposit", amount: "+₦850,000", category: "Income", time: "Yesterday", status: "completed" },
  { id: 3, name: "Uber Ride", amount: "-₦3,200", category: "Transportation", time: "Yesterday", status: "completed" },
  {
    id: 4,
    name: "Netflix Subscription",
    amount: "-₦2,900",
    category: "Entertainment",
    time: "2 days ago",
    status: "completed",
  },
  {
    id: 5,
    name: "Electricity Bill",
    amount: "-₦12,500",
    category: "Utilities",
    time: "3 days ago",
    status: "completed",
  },
  { id: 6, name: "Bank Transfer", amount: "-₦50,000", category: "Transfer", time: "3 days ago", status: "completed" },
  { id: 7, name: "ATM Withdrawal", amount: "-₦20,000", category: "Cash", time: "4 days ago", status: "completed" },
  {
    id: 8,
    name: "Restaurant Payment",
    amount: "-₦15,600",
    category: "Food & Dining",
    time: "4 days ago",
    status: "completed",
  },
  { id: 9, name: "Freelance Income", amount: "+₦125,000", category: "Income", time: "5 days ago", status: "completed" },
  {
    id: 10,
    name: "Gym Membership",
    amount: "-₦5,500",
    category: "Health & Wellness",
    time: "5 days ago",
    status: "completed",
  },
]

export default function TransactionsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const categories = [
    "All",
    "Food & Dining",
    "Transportation",
    "Entertainment",
    "Utilities",
    "Transfer",
    "Cash",
    "Health & Wellness",
    "Income",
  ]

  const filteredTransactions = allTransactions.filter((transaction) => {
    const matchesSearch =
      transaction.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.category.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = !selectedCategory || selectedCategory === "All" || transaction.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="min-h-screen bg-background">
      <Navigation currentPage="transactions" />

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-foreground mb-2">Transactions</h1>
          <p className="text-muted-foreground">View and manage all your financial transactions</p>
        </div>

        {/* Controls */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="bg-transparent border-border">
              <Calendar className="w-4 h-4 mr-2" />
              Date Range
            </Button>
            <Button variant="outline" className="bg-transparent border-border">
              <Filter className="w-4 h-4 mr-2" />
              More Filters
            </Button>
            <Button variant="outline" className="bg-transparent border-border">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(selectedCategory === category ? null : category)}
              className={`px-4 py-2 rounded-lg border transition-colors whitespace-nowrap ${
                selectedCategory === category || (selectedCategory === null && category === "All")
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/50 text-foreground border-border hover:border-primary"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Transactions List */}
        <Card className="border-border bg-card">
          <CardContent className="p-0">
            <div className="space-y-0">
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((transaction, index) => (
                  <div
                    key={transaction.id}
                    className={`flex items-center justify-between p-4 ${
                      index !== filteredTransactions.length - 1 ? "border-b border-border" : ""
                    }`}
                  >
                    <div className="flex items-center space-x-4 flex-1">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          transaction.amount.startsWith("+") ? "bg-chart-3/10" : "bg-muted"
                        }`}
                      >
                        {transaction.amount.startsWith("+") ? (
                          <ArrowDownRight className="w-5 h-5 text-chart-3" />
                        ) : (
                          <ArrowUpRight className="w-5 h-5 text-foreground" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-foreground">{transaction.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {transaction.category} • {transaction.time}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="secondary" className="bg-muted text-foreground border-border">
                        {transaction.status}
                      </Badge>
                      <div
                        className={`font-semibold text-right min-w-[100px] ${
                          transaction.amount.startsWith("+") ? "text-chart-3" : "text-foreground"
                        }`}
                      >
                        {transaction.amount}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center">
                  <p className="text-muted-foreground">No transactions found matching your filters</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
