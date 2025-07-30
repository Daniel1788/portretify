"use client"

import React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/lib/auth"
import { Loader2, CheckCircle, Mail } from "lucide-react"

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { signIn, signUp, user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showEmailVerification, setShowEmailVerification] = useState(false)
  const [userEmail, setUserEmail] = useState("")

  // Închide modal-ul și redirectionează când utilizatorul se conectează
  React.useEffect(() => {
    if (user && isOpen) {
      onClose()
      router.push("/lessons")
    }
  }, [user, isOpen, onClose, router])

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    const { error } = await signIn(email, password)

    if (error) {
      setError(error.message)
      setLoading(false)
    }
    // Nu setăm loading la false aici pentru că useEffect va închide modal-ul
  }

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const fullName = formData.get("fullName") as string

    const { error } = await signUp(email, password, fullName)

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      // Arată mesajul de verificare email
      setUserEmail(email)
      setShowEmailVerification(true)
      setLoading(false)
    }
  }

  const handleCloseVerification = () => {
    setShowEmailVerification(false)
    onClose()
  }

  // Afișează mesajul de verificare email
  if (showEmailVerification) {
    return (
      <Dialog open={isOpen} onOpenChange={handleCloseVerification}>
        <DialogContent className="sm:max-w-md rounded-lg border-2 border-border">
          <DialogHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <DialogTitle className="bauhaus-heading text-xl">Verifică-ți emailul</DialogTitle>
            <DialogDescription className="text-base">
              Am trimis un link de confirmare la adresa <strong>{userEmail}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start space-x-3">
                <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900 mb-1">Următorii pași:</p>
                  <ol className="text-blue-700 space-y-1 list-decimal list-inside">
                    <li>Verifică-ți inbox-ul (și folderul spam)</li>
                    <li>Dă click pe link-ul de confirmare</li>
                    <li>Revino aici și conectează-te</li>
                  </ol>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={handleCloseVerification}
                className="flex-1 rounded-lg bauhaus-button bg-transparent"
              >
                Am înțeles
              </Button>
              
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md rounded-lg border-2 border-border">
        <DialogHeader>
          <DialogTitle className="bauhaus-heading">Conectează-te la PortraitMaster</DialogTitle>
          <DialogDescription>
            Conectează-te pentru a-ți salva progresul și a accesa toate funcționalitățile.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2 rounded-lg">
            <TabsTrigger value="signin" className="rounded-lg">
              Conectare
            </TabsTrigger>
            <TabsTrigger value="signup" className="rounded-lg">
              Înregistrare
            </TabsTrigger>
          </TabsList>

          <TabsContent value="signin">
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signin-email">Email</Label>
                <Input
                  id="signin-email"
                  name="email"
                  type="email"
                  placeholder="exemplu@email.com"
                  required
                  className="rounded-lg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signin-password">Parolă</Label>
                <Input id="signin-password" name="password" type="password" required className="rounded-lg" />
              </div>
              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">{error}</div>
              )}
              <Button type="submit" className="w-full rounded-lg bauhaus-button" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Conectează-te
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-name">Nume complet</Label>
                <Input
                  id="signup-name"
                  name="fullName"
                  type="text"
                  placeholder="Numele tău"
                  required
                  className="rounded-lg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input
                  id="signup-email"
                  name="email"
                  type="email"
                  placeholder="exemplu@email.com"
                  required
                  className="rounded-lg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">Parolă</Label>
                <Input
                  id="signup-password"
                  name="password"
                  type="password"
                  minLength={6}
                  placeholder="Minim 6 caractere"
                  required
                  className="rounded-lg"
                />
              </div>
              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">{error}</div>
              )}
              <Button type="submit" className="w-full rounded-lg bauhaus-button" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Înregistrează-te
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
