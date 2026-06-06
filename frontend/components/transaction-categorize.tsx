"use client"

import { useState, useEffect } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tag, Sparkles, Check, X } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"

interface Category {
  id: string
  name: string
  kind: string
  is_system: boolean
}

interface Transaction {
  id: string
  merchant_name: string
  description?: string
  amount_minor: number
  category?: Category
  currency: string
  booked_at: string
}

interface Props {
  transaction: Transaction
  onCategorize: (transactionId: string, categoryId: string | null) => void
  categories: Category[]
}

export function TransactionCategorize({ transaction, onCategorize, categories }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<string>(
    transaction.category?.id || ""
  )
  const [suggestions, setSuggestions] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Fetch category suggestions
  const fetchSuggestions = async () => {
    try {
      const data = await api.transactions.suggestCategories(transaction.id)
      setSuggestions(data)
      setShowSuggestions(true)
    } catch (error) {
      console.error("Failed to fetch suggestions:", error)
      toast.error("Failed to get suggestions")
    }
  }

  // Update category
  const handleCategoryChange = async (categoryId: string) => {
    setLoading(true)
    try {
      await api.transactions.categorize(
        transaction.id,
        categoryId === "none" ? null : categoryId
      )
      setSelectedCategory(categoryId === "none" ? "" : categoryId)
      onCategorize(transaction.id, categoryId === "none" ? null : categoryId)
      toast.success("Category updated")
      setShowSuggestions(false)
    } catch (error) {
      console.error("Error updating category:", error)
      toast.error("Failed to update category")
    } finally {
      setLoading(false)
    }
  }

  // Apply suggestion
  const applySuggestion = (category: Category) => {
    handleCategoryChange(category.id)
  }

  return (
    <div className="flex items-center gap-2">
      <Select
        value={selectedCategory}
        onValueChange={handleCategoryChange}
        disabled={loading}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select category">
            {selectedCategory ? (
              <div className="flex items-center gap-2">
                <Tag className="h-3 w-3" />
                <span className="truncate">
                  {categories.find((c) => c.id === selectedCategory)?.name || "Unknown"}
                </span>
              </div>
            ) : (
              <span className="text-muted-foreground">No category</span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">
            <div className="flex items-center gap-2">
              <X className="h-3 w-3" />
              <span>No category</span>
            </div>
          </SelectItem>

          {/* Group categories by type */}
          <div className="text-xs font-semibold text-muted-foreground px-2 py-1">
            Expense Categories
          </div>
          {categories
            .filter((c) => c.kind === "expense")
            .map((category) => (
              <SelectItem key={category.id} value={category.id}>
                <div className="flex items-center gap-2">
                  <Tag className="h-3 w-3" />
                  <span>{category.name}</span>
                </div>
              </SelectItem>
            ))}

          <div className="text-xs font-semibold text-muted-foreground px-2 py-1 mt-2">
            Income Categories
          </div>
          {categories
            .filter((c) => c.kind === "income")
            .map((category) => (
              <SelectItem key={category.id} value={category.id}>
                <div className="flex items-center gap-2">
                  <Tag className="h-3 w-3" />
                  <span>{category.name}</span>
                </div>
              </SelectItem>
            ))}
        </SelectContent>
      </Select>

      {/* AI Suggestions Button */}
      {!transaction.category && (
        <Button
          size="sm"
          variant="outline"
          onClick={fetchSuggestions}
          disabled={loading}
        >
          <Sparkles className="h-3 w-3 mr-1" />
          Suggest
        </Button>
      )}

      {/* Show suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="flex gap-1">
          {suggestions.map((suggestion) => (
            <Badge
              key={suggestion.id}
              variant="secondary"
              className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
              onClick={() => applySuggestion(suggestion)}
            >
              <Check className="h-3 w-3 mr-1" />
              {suggestion.name}
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}

// Bulk categorization component
export function BulkCategorize({ onComplete }: { onComplete: () => void }) {
  const [loading, setLoading] = useState(false)

  const handleAutoCategorize = async () => {
    setLoading(true)
    try {
      const data = await api.transactions.autoCategorize()
      toast.success(data.message)
      onComplete()
    } catch (error) {
      console.error("Error auto-categorizing:", error)
      toast.error("Failed to auto-categorize transactions")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handleAutoCategorize}
      disabled={loading}
      variant="outline"
      size="sm"
    >
      <Sparkles className="h-4 w-4 mr-2" />
      {loading ? "Categorizing..." : "Auto-Categorize All"}
    </Button>
  )
}