import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Mic, BarChart3, Shield, Globe, TrendingUp } from "lucide-react"
import Link from "next/link"
import { Navigation } from "@/components/navigation"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <Navigation showLinks={false} />

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <Badge variant="secondary" className="mb-6 bg-accent/10 text-accent border-accent/20">
            <Globe className="w-4 h-4 mr-2" />
            Announcing $20M in Seed & Series A Funding
          </Badge>

          <h1 className="text-4xl md:text-6xl font-serif font-bold text-foreground mb-6 text-balance">
            AI-Powered Financial Management for Africa
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto text-pretty">
            Your intelligent financial companion that speaks your language, understands African banking, and provides
            personalized insights through natural conversation.
          </p>

          <Link href="/home">
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-lg">
              Enter App
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <Card className="border-border bg-card hover:shadow-lg transition-shadow">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Mic className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-serif font-semibold mb-4">Voice AI Assistant</h3>
                <p className="text-muted-foreground text-pretty">
                  Chat with your finances in English, Swahili, Yoruba, Hausa, French, or Arabic. Get instant insights
                  through natural conversation.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border bg-card hover:shadow-lg transition-shadow">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <BarChart3 className="w-8 h-8 text-accent" />
                </div>
                <h3 className="text-xl font-serif font-semibold mb-4">Smart Analytics</h3>
                <p className="text-muted-foreground text-pretty">
                  Automated spending categorization, trend analysis, and personalized recommendations to improve your
                  financial health.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border bg-card hover:shadow-lg transition-shadow">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-chart-3/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Shield className="w-8 h-8 text-chart-3" />
                </div>
                <h3 className="text-xl font-serif font-semibold mb-4">Bank-Grade Security</h3>
                <p className="text-muted-foreground text-pretty">
                  End-to-end encryption, multi-factor authentication, and compliance with African banking regulations
                  for complete peace of mind.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-6 text-balance">
            Ready to transform your financial future?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 text-pretty">
            Join thousands of African professionals who are already using Finsight AI to make smarter financial
            decisions.
          </p>
          <Link href="/home">
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-lg">
              Get Started Today
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30 py-12 px-4">
        <div className="container mx-auto text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-6 h-6 bg-primary rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-serif font-bold text-foreground">Finsight AI</span>
          </div>
          <p className="text-muted-foreground">© 2025 Finsight AI. Empowering African financial futures with AI.</p>
        </div>
      </footer>
    </div>
  )
}
