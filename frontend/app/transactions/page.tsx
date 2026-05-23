"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Navigation } from "@/components/navigation"
import { ArrowUpRight, ArrowDownRight, Search, Loader2, RefreshCw } from "lucide-react"
import { api, type Transaction, type Category, type Paginated, formatCurrency, isDebit, formatRelativeTime } from "@/lib/api"
import { toast } from "sonner"

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasNext, setHasNext] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  const fetchTransactions = useCallback(
    async (p: number, catId?: string | null, append = false) => {
      try {
        const res = await api.transactions.list({
          page: p,
          ...(catId ? { category: catId } : {}),
        }) as Paginated<Transaction>
        setHasNext(!!res.next)
        setTransactions((prev) => (append ? [...prev, ...res.results] : res.results))
      } catch {
        toast.error("Failed to load transactions.")
      }
    },
    []
  )

  useEffect(() => {
    Promise.all([
      api.categories.list(),
      fetchTransactions(1, selectedCategory),
    ])
      .then(([catRes]) => {
        // only expense categories + "All"
        setCategories((catRes as Paginated<Category>).results.filter((c) => c.kind === "expense" || c.kind === "income"))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, []) // eslint-disable-line

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

  const filtered = transactions.filter((t) =>
    searchTerm
      ? t.merchant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.category_name ?? "").toLowerCase().includes(searchTerm.toLowerCase())
      : true
  )

  return (
    <div className="min-h-screen bg-background">
      <Navigation currentPage="transactions" />

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-foreground mb-2">Transactions</h1>
          <p className="text-muted-foreground">View and manage all your financial transactions</p>
        </div>

        {/* Search */}
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            className="bg-transparent border-border"
            onClick={() => { setPage(1); setLoading(true); fetchTransactions(1, selectedCategory).finally(() => setLoading(false)) }}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {/* Category filter */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => handleCategoryChange(null)}
            className={`px-4 py-2 rounded-lg border transition-colors whitespace-nowrap ${
              selectedCategory === null
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted/50 text-foreground border-border hover:border-primary"
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryChange(cat.id)}
              className={`px-4 py-2 rounded-lg border transition-colors whitespace-nowrap ${
                selectedCategory === cat.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/50 text-foreground border-border hover:border-primary"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* List */}
        <Card className="border-border bg-card">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-muted-foreground">
                  {transactions.length === 0
                    ? "No transactions yet. Connect a bank account from the dashboard."
                    : "No transactions match your search."}
                </p>
              </div>
            ) : (
              <div className="space-y-0">
                {filtered.map((txn, idx) => (
                  <div
                    key={txn.id}
                    className={`flex items-center justify-between p-4 ${
                      idx !== filtered.length - 1 ? "border-b border-border" : ""
                    }`}
                  >
                    <div className="flex items-center space-x-4 flex-1">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          isDebit(txn.amount_minor) ? "bg-muted" : "bg-chart-3/10"
                        }`}
                      >
                        {isDebit(txn.amount_minor) ? (
                          <ArrowUpRight className="w-5 h-5 text-foreground" />
                        ) : (
                          <ArrowDownRight className="w-5 h-5 text-chart-3" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-foreground truncate">{txn.merchant_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {txn.category_name ?? "Uncategorized"} • {formatRelativeTime(txn.booked_at)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 ml-4">
                      <Badge variant="secondary" className="bg-muted text-foreground border-border hidden sm:flex">
                        {txn.status}
                      </Badge>
                      <div
                        className={`font-semibold text-right min-w-[90px] ${
                          isDebit(txn.amount_minor) ? "text-foreground" : "text-chart-3"
                        }`}
                      >
                        {isDebit(txn.amount_minor) ? "-" : "+"}{formatCurrency(txn.amount_minor)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {hasNext && !loading && (
          <div className="mt-4 text-center">
            <Button
              variant="outline"
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="bg-transparent"
            >
              {loadingMore && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Load more
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
