"use client";

import { Button } from "@/components/ui/button";
import { Bell, Settings, User, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

type Notification = {
  id: string;
  type: "warning" | "info" | "success";
  title: string;
  body: string;
};

const DOT_COLOR: Record<Notification["type"], string> = {
  warning: "bg-accent",
  info: "bg-primary",
  success: "bg-chart-3",
};
const CARD_COLOR: Record<Notification["type"], string> = {
  warning: "bg-accent/10 border-accent/20",
  info: "bg-primary/10 border-primary/20",
  success: "bg-chart-3/10 border-chart-3/20",
};

interface NavigationProps {
  showLinks?: boolean;
  currentPage?:
    | "dashboard"
    | "transactions"
    | "insights"
    | "settings"
    | "ai-insights";
}

export function Navigation({ showLinks = true, currentPage }: NavigationProps) {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!showLinks) return;
    api.notifications
      .list()
      .then((data) => {
        setNotifications(data);
        setUnread(data.length);
      })
      .catch(() => {});
  }, [showLinks]);

  return (
    <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-serif font-bold text-foreground">
            Finsight AI
          </span>
        </Link>

        {showLinks && (
          <div className="hidden md:flex items-center space-x-8">
            <Link
              href="/home"
              className={
                currentPage === "dashboard"
                  ? "text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground transition-colors"
              }
            >
              Dashboard
            </Link>
            <Link
              href="/transactions"
              className={
                currentPage === "transactions"
                  ? "text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground transition-colors"
              }
            >
              Transactions
            </Link>
            <Link
              href="/insights"
              className={
                currentPage === "insights"
                  ? "text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground transition-colors"
              }
            >
              Insights
            </Link>
            {/* <Link
              href="/ai-insights"
              className={currentPage === "ai-insights" ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground transition-colors"}
            >
              🧠 AI Intelligence
            </Link> */}
          </div>
        )}

        <div className="flex items-center space-x-4">
          {showLinks && (
            <>
              {/* Notifications */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative"
                    onClick={() => setUnread(0)}
                  >
                    <Bell className="w-5 h-5" />
                    {unread > 0 && (
                      <span className="absolute top-1 right-1 w-2 h-2 bg-accent rounded-full" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <div className="p-2 space-y-2 max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">
                        No notifications
                      </p>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`flex items-start space-x-3 p-3 rounded-lg border ${CARD_COLOR[n.type]}`}
                        >
                          <div
                            className={`w-2 h-2 rounded-full mt-2 shrink-0 ${DOT_COLOR[n.type]}`}
                          />
                          <div>
                            <p className="font-medium text-foreground text-sm">
                              {n.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {n.body}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Settings */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Settings className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Settings</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/settings">Account Settings</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings#security">Security</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings/banks">Connected Banks</Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* User */}
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
                        <p className="font-medium text-foreground">
                          {user?.full_name ?? "—"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {user?.email ?? ""}
                        </p>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/settings">View Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive cursor-pointer"
                    onClick={logout}
                  >
                    Logout
                  </DropdownMenuItem>
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
  );
}
