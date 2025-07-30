"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth"
import { AuthModal } from "@/components/auth-modal"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Circle, Square, User, Settings, LogOut, Shield } from "lucide-react"
import Link from "next/link"

export function Navigation() {
  const { user, profile, signOut, isAdmin } = useAuth()
  const [showAuthModal, setShowAuthModal] = useState(false)

  return (
    <>
      <header className="border-b border-border bg-background sticky top-0 z-50 py-2">
        <div className="bauhaus-container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-4">
              <div className="flex items-center">
                <Circle className="h-6 w-6 text-accent" />
                <Square className="h-6 w-6 text-secondary absolute ml-3" />
              </div>
              <h1 className="text-xl font-bold bauhaus-heading">PortraitMaster</h1>
            </Link>

            <nav className="hidden md:flex items-center space-x-8 bauhaus-nav">
              {user ? (
                <>
                  <Link href="/lessons" className="text-foreground hover:text-accent transition-colors">
                    Lecții
                  </Link>
                  <Link href="/practice" className="text-foreground hover:text-accent transition-colors">
                    Practică
                  </Link>
                  <Link href="/model-3d" className="text-foreground hover:text-accent transition-colors">
                    Model 3D
                  </Link>
                  <Link href="/gallery" className="text-foreground hover:text-accent transition-colors">
                    Galerie
                  </Link>

                  <div className="flex items-center space-x-4">
                    <ThemeToggle />

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-10 w-10 rounded-lg p-0">
                          <div className="h-10 w-10 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center hover:bg-accent/20 transition-colors">
                            <User className="h-5 w-5 text-accent" />
                          </div>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-56 rounded-lg" align="end" forceMount>
                        <div className="flex items-center justify-start gap-2 p-2">
                          <div className="h-8 w-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center px-[5]">
                            <User className="h-4 w-4 text-accent" />
                          </div>
                          <div className="flex flex-col space-y-1 leading-none">
                            <p className="font-medium">{profile?.full_name || "Utilizator"}</p>
                            <p className="w-[180px] truncate text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href="/profile" className="cursor-pointer">
                            <User className="mr-2 h-4 w-4" />
                            Profil
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/settings" className="cursor-pointer">
                            <Settings className="mr-2 h-4 w-4" />
                            Setări
                          </Link>
                        </DropdownMenuItem>
                        {isAdmin && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                              <Link href="/admin" className="cursor-pointer">
                                <Shield className="mr-2 h-4 w-4" />
                                Admin Panel
                              </Link>
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={signOut} className="cursor-pointer">
                          <LogOut className="mr-2 h-4 w-4" />
                          Deconectare
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </>
              ) : (
                <div className="flex items-center space-x-6">
                  <ThemeToggle />
                  <Button onClick={() => setShowAuthModal(true)} className="rounded-lg bauhaus-button px-6">
                    Conectare
                  </Button>
                </div>
              )}
            </nav>

            {/* Mobile menu - simplified for now */}
            <div className="md:hidden flex items-center space-x-4">
              <ThemeToggle />
              {user ? (
                <div className="h-8 w-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
                  <User className="h-4 w-4 text-accent" />
                </div>
              ) : (
                <Button size="sm" onClick={() => setShowAuthModal(true)} className="rounded-lg bauhaus-button px-4">
                  Conectare
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </>
  )
}
