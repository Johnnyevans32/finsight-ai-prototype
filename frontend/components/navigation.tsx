"use client"

import { Button } from "@/components/ui/button"
import { Bell, Settings, User, TrendingUp } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface NavigationProps {
  showLinks?: boolean
  currentPage?: "dashboard" | "transactions" | "insights"
}

export function Navigation({ showLinks = true, currentPage }: NavigationProps) {
  const [notificationCount, setNotificationCount] = useState(2)

  return (
    <>
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-serif font-bold text-foreground">Finsight AI</span>
          </Link>

          {showLinks && (
            <div className="hidden md:flex items-center space-x-8">
              <Link
                href="/home"
                className={`${
                  currentPage === "dashboard"
                    ? "text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground transition-colors"
                }`}
              >
                Dashboard
              </Link>
              <Link
                href="/transactions"
                className={`${
                  currentPage === "transactions"
                    ? "text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground transition-colors"
                }`}
              >
                Transactions
              </Link>
              <Link
                href="/insights"
                className={`${
                  currentPage === "insights"
                    ? "text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground transition-colors"
                }`}
              >
                Insights
              </Link>
            </div>
          )}

          <div className="flex items-center space-x-4">
            {showLinks && (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative" onClick={() => setNotificationCount(0)}>
                      <Bell className="w-5 h-5" />
                      {notificationCount > 0 && (
                        <span className="absolute top-1 right-1 w-2 h-2 bg-accent rounded-full"></span>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-80">
                    <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <div className="p-2 space-y-2">
                      <div className="flex items-start space-x-3 p-3 rounded-lg bg-accent/10 border border-accent/20">
                        <div className="w-2 h-2 rounded-full bg-accent mt-2"></div>
                        <div>
                          <p className="font-medium text-foreground text-sm">Budget alert for dining</p>
                          <p className="text-xs text-muted-foreground">
                            You've spent 85% of your dining budget this month
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
                        <div className="w-2 h-2 rounded-full bg-primary mt-2"></div>
                        <div>
                          <p className="font-medium text-foreground text-sm">
                            Congratulations on saving more this month!
                          </p>
                          <p className="text-xs text-muted-foreground">You've saved 15% more than last month</p>
                        </div>
                      </div>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Settings className="w-5 h-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Settings</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <div className="space-y-1">
                        <p className="font-medium">Account Settings</p>
                        <p className="text-xs text-muted-foreground">Manage your personal information</p>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <div className="space-y-1">
                        <p className="font-medium">Security</p>
                        <p className="text-xs text-muted-foreground">Password and authentication</p>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <div className="space-y-1">
                        <p className="font-medium">Notifications</p>
                        <p className="text-xs text-muted-foreground">Choose what updates you receive</p>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <div className="space-y-1">
                        <p className="font-medium">Connected Banks</p>
                        <p className="text-xs text-muted-foreground">Manage your bank connections</p>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <div className="space-y-1">
                        <p className="font-medium">Language</p>
                        <p className="text-xs text-muted-foreground">English</p>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <User className="w-5 h-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                          <User className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">Adaora Okonkwo</p>
                          <p className="text-xs text-muted-foreground">adaora@example.com</p>
                        </div>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>View Profile</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive focus:text-destructive">Logout</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
            {!showLinks && (
              <Link href="/login">
                <Button variant="outline" className="bg-transparent">
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>
      </nav>
    </>
  )
}
