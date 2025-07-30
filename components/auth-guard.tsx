"use client"

import type React from "react"
import { useState } from "react"
import { useAuth } from "@/lib/auth"
import { AuthModal } from "@/components/auth-modal"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Lock } from "lucide-react"

interface AuthGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function AuthGuard({ children, fallback }: AuthGuardProps): JSX.Element {
  const { user, loading } = useAuth()
  const [showAuthModal, setShowAuthModal] = useState(false)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-lg h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Se încarcă...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <>
        {fallback || (
          <div className="min-h-screen flex items-center justify-center bg-background px-4">
            <Card className="w-full max-w-md rounded-lg border-2 border-border">
              <CardHeader className="text-center">
                <div className="mx-auto w-12 h-12 bg-accent/20 rounded-lg flex items-center justify-center mb-4">
                  <Lock className="h-6 w-6 text-accent" />
                </div>
                <CardTitle className="bauhaus-heading">Autentificare necesară</CardTitle>
                <CardDescription>
                  Pentru a accesa această pagină, trebuie să te conectezi la contul tău PortraitMaster.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button variant="outline" asChild className="w-full rounded-lg bauhaus-button bg-transparent">
                  <a href="/">Înapoi la pagina principală</a>
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      </>
    )
  }

  return <>{children}</>
}
