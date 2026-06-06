"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Navigation } from "@/components/navigation"
import { CreateCategoryDialog } from "@/components/create-category-dialog"
import {
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Loader2,
  RefreshCw,
  Tag,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Filter,
  ShoppingBag,
  Home,
  Car,
  Utensils,
  Heart,
  Briefcase,
  Plane,
  Gift,
  Zap,
  Plus
} from "lucide-react"
import { api, type Transaction, type Category, type Paginated, formatCurrency, isDebit, formatRelativeTime } from "@/lib/api"
import { toast } from "sonner"
import { TransactionCategorize, BulkCategorize } from "@/components/transaction-categorize"

// Category icon mapping
const getCategoryIcon = (categoryName: string) => {
  const name = categoryName.toLowerCase()
  if (name.includes('food') || name.includes('dining')) return <Utensils className="w-4 h-4" />
  if (name.includes('transport')) return <Car className="w-4 h-4" />
  if (name.includes('shopping')) return <ShoppingBag className="w-4 h-4" />
  if (name.includes('rent') || name.includes('housing')) return <Home className="w-4 h-4" />
  if (name.includes('health')) return <Heart className="w-4 h-4" />
  if (name.includes('salary') || name.includes('income')) return <Briefcase className="w-4 h-4" />
  if (name.includes('travel')) return <Plane className="w-4 h-4" />
  if (name.includes('gift') || name.includes('charity')) return <Gift className="w-4 h-4" />
  if (name.includes('utilities')) return <Zap className="w-4 h-4" />
  return <Tag className="w-4 h-4" />
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasNext, setHasNext] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [dateFilter, setDateFilter] = useState<'all' | 'week' | 'month' | 'year'>('month')

  // Calculate statistics
  const stats = useMemo(() => {
    const income = transactions
      .filter(t => t.amount_minor > 0)
      .reduce((sum, t) => sum + t.amount_minor, 0)

    const expenses = transactions
      .filter(t => t.amount_minor < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount_minor), 0)

    const categorized = transactions.filter(t => t.category).length
    const total = transactions.length
    const categorizationRate = total > 0 ? (categorized / total) * 100 : 0

    // Top spending categories
    const categorySpending = transactions
      .filter(t => t.amount_minor < 0 && t.category)
      .reduce((acc, t) => {
        const catName = t.category?.name || 'Uncategorized'
        acc[catName] = (acc[catName] || 0) + Math.abs(t.amount_minor)
        return acc
      }, {} as Record<string, number>)

    const topCategories = Object.entries(categorySpending)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([name, amount]) => ({ name, amount }))

    return {
      income,
      expenses,
      balance: income - expenses,
      categorizationRate,
      topCategories,
      totalTransactions: total,
    }
  }, [transactions])

  const fetchTransactions = useCallback(
    async (p: number, catId?: string | null, append = false) => {
      try {
        // Calculate date range based on filter
        const now = new Date()
        let dateFrom: string | undefined

        if (dateFilter !== 'all') {
          const date = new Date()
          if (dateFilter === 'week') {
            date.setDate(date.getDate() - 7)
          } else if (dateFilter === 'month') {
            date.setMonth(date.getMonth() - 1)
          } else if (dateFilter === 'year') {
            date.setFullYear(date.getFullYear() - 1)
          }
          dateFrom = date.toISOString().split('T')[0]
        }

        const res = await api.transactions.list({
          page: p,
          ...(catId ? { category: catId } : {}),
          ...(dateFrom ? { date_from: dateFrom } : {}),
        }) as Paginated<Transaction>

        setHasNext(!!res.next)
        setTransactions((prev) => (append ? [...prev, ...res.results] : res.results))
      } catch {
        toast.error("Failed to load transactions.")
      }
    },
    [dateFilter]
  )

  useEffect(() => {
    Promise.all([
      api.categories.list(),
      fetchTransactions(1, selectedCategory),
    ])
      .then(([catRes]) => {
        setCategories((catRes as Paginated<Category>).results)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [dateFilter]) // eslint-disable-line

  const handleCategoryChange = async (catId: string | null) => {
    setSelectedCategory(catId)
    setPage(1)
    setLoading(true)
    await fetchTransactions(1, catId)
    setLoading(false)
  }

  const handleLoadMore = async () => {
    const nextPage = page + 1
    setLoadingMore(true)
    await fetchTransactions(nextPage, selectedCategory, true)
    setPage(nextPage)
    setLoadingMore(false)
  }

  const handleTransactionCategorize = (transactionId: string, categoryId: string | null) => {
    setTransactions(prev =>
      prev.map(txn =>
        txn.id === transactionId
          ? { ...txn, category: categories.find(c => c.id === categoryId) || undefined }
          : txn
      )
    )
  }

  const handleRefresh = async () => {
    setPage(1)
    setLoading(true)
    await Promise.all([
      api.categories.list().then((catRes) => {
        setCategories((catRes as Paginated<Category>).results)
      }),
      fetchTransactions(1, selectedCategory)
    ])
    setLoading(false)
    toast.success("Transactions refreshed")
  }

  const filtered = transactions.filter((t) =>
    searchTerm
      ? t.merchant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.description || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.category?.name || "").toLowerCase().includes(searchTerm.toLowerCase())
      : true
  )

  return (
    <div className="min-h-screen bg-background">
      <Navigation currentPage="transactions" />

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-foreground mb-2">
            Transaction History
          </h1>
          <p className="text-muted-foreground">
            Track your spending, categorize transactions, and gain insights into your financial habits
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Income</CardTitle>
              <TrendingUp className="h-4 w-4 text-chart-3" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-chart-3">
                +{formatCurrency(stats.income)}
              </div>
              <p className="text-xs text-muted-foreground">
                This {dateFilter === 'all' ? 'period' : dateFilter}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <TrendingDown className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                -{formatCurrency(stats.expenses)}
              </div>
              <p className="text-xs text-muted-foreground">
                This {dateFilter === 'all' ? 'period' : dateFilter}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stats.balance >= 0 ? 'text-chart-3' : 'text-destructive'}`}>
                {stats.balance >= 0 ? '+' : ''}{formatCurrency(stats.balance)}
              </div>
              <p className="text-xs text-muted-foreground">
                Income - Expenses
              </p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Categorized</CardTitle>
              <Tag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.categorizationRate.toFixed(0)}%
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.totalTransactions} transactions
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Top Spending Categories */}
        {stats.topCategories.length > 0 && (
          <Card className="border-border bg-card mb-6">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Top Spending Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.topCategories.map((cat, idx) => (
                  <div key={cat.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">
                        {idx + 1}.
                      </span>
                      {getCategoryIcon(cat.name)}
                      <span className="text-sm font-medium">{cat.name}</span>
                    </div>
                    <span className="text-sm font-bold text-destructive">
                      {formatCurrency(cat.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters and Actions */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by merchant, description, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div className="flex gap-2">
            {/* Date Filter */}
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="px-3 py-2 rounded-lg border border-border bg-muted/50 text-foreground text-sm"
            >
              <option value="week">Past Week</option>
              <option value="month">Past Month</option>
              <option value="year">Past Year</option>
              <option value="all">All Time</option>
            </select>

            <CreateCategoryDialog
              onCategoryCreated={handleRefresh}
              trigger={
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Category
                </Button>
              }
            />

            <BulkCategorize onComplete={handleRefresh} />

            <Button
              variant="outline"
              size="icon"
              className="bg-transparent border-border"
              onClick={handleRefresh}
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => handleCategoryChange(null)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              selectedCategory === null
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-muted/50 text-foreground hover:bg-muted"
            }`}
          >
            All Categories
          </button>

          {/* Income Categories */}
          {categories.filter(c => c.kind === 'income').length > 0 && (
            <>
              <div className="px-2 py-2 text-xs text-muted-foreground font-semibold">INCOME</div>
              {categories
                .filter(c => c.kind === 'income')
                .map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => handleCategoryChange(cat.id)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                      selectedCategory === cat.id
                        ? "bg-chart-3/20 text-chart-3 shadow-md border border-chart-3"
                        : "bg-muted/50 text-foreground hover:bg-muted"
                    }`}
                  >
                    {getCategoryIcon(cat.name)}
                    {cat.name}
                  </button>
                ))}
            </>
          )}

          {/* Expense Categories */}
          {categories.filter(c => c.kind === 'expense').length > 0 && (
            <>
              <div className="px-2 py-2 text-xs text-muted-foreground font-semibold">EXPENSES</div>
              {categories
                .filter(c => c.kind === 'expense')
                .map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => handleCategoryChange(cat.id)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                      selectedCategory === cat.id
                        ? "bg-destructive/20 text-destructive shadow-md border border-destructive"
                        : "bg-muted/50 text-foreground hover:bg-muted"
                    }`}
                  >
                    {getCategoryIcon(cat.name)}
                    {cat.name}
                  </button>
                ))}
            </>
          )}
        </div>

        {/* Transaction List */}
        <Card className="border-border bg-card">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Loading transactions...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground mb-2 font-medium">
                  {transactions.length === 0
                    ? "No transactions yet"
                    : "No transactions found"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {transactions.length === 0
                    ? "Connect a bank account from the dashboard to see your transactions."
                    : "Try adjusting your search or filters."}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filtered.map((txn) => (
                  <div
                    key={txn.id}
                    className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      {/* Transaction Icon */}
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          isDebit(txn.amount_minor)
                            ? "bg-destructive/10"
                            : "bg-chart-3/10"
                        }`}
                      >
                        {txn.category ? (
                          getCategoryIcon(txn.category.name)
                        ) : isDebit(txn.amount_minor) ? (
                          <ArrowUpRight className="w-5 h-5 text-destructive" />
                        ) : (
                          <ArrowDownRight className="w-5 h-5 text-chart-3" />
                        )}
                      </div>

                      {/* Transaction Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground truncate">
                            {txn.merchant_name}
                          </span>
                          {txn.category && (
                            <Badge
                              variant={txn.category.kind === 'income' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {txn.category.name}
                            </Badge>
                          )}
                        </div>
                        {txn.description && (
                          <p className="text-sm text-muted-foreground truncate">
                            {txn.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <Calendar className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {formatRelativeTime(txn.booked_at)} • {txn.account_name}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions and Amount */}
                    <div className="flex items-center gap-4 ml-4">
                      {!txn.category && (
                        <TransactionCategorize
                          transaction={txn}
                          categories={categories}
                          onCategorize={handleTransactionCategorize}
                        />
                      )}

                      <div className="text-right">
                        <div
                          className={`font-bold text-lg ${
                            isDebit(txn.amount_minor) ? "text-destructive" : "text-chart-3"
                          }`}
                        >
                          {isDebit(txn.amount_minor) ? "-" : "+"}{formatCurrency(txn.amount_minor)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {txn.currency}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Load More */}
        {hasNext && !loading && (
          <div className="mt-6 text-center">
            <Button
              variant="outline"
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="bg-transparent"
            >
              {loadingMore ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Loading more...
                </>
              ) : (
                <>
                  Load more transactions
                </>
              )}
            </Button>
          </div>
        )}

        {/* Summary Footer */}
        {filtered.length > 0 && (
          <div className="mt-6 text-center text-sm text-muted-foreground">
            Showing {filtered.length} of {stats.totalTransactions} transactions
          </div>
        )}
      </div>
    </div>
  )
}