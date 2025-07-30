"use client"
import { useAuth } from "@/lib/auth"
import type React from "react"
import { useState } from "react"

import { Navigation } from "@/components/navigation"
import { Circle, Square, Triangle, BookOpen, Palette, Users, Award } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import { AuthModal } from "@/components/auth-modal"

export default function HomePage() {
  const { user } = useAuth()
  const [showAuthModal, setShowAuthModal] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <Navigation />

      {/* Hero Section */}
      <section className="py-20 px-4 relative overflow-hidden">
        <div className="bauhaus-container mx-auto text-center content-layer">
          {/* Bauhaus decorative elements */}
          <div className="bg-decoration top-0 left-0 w-32 h-32 rounded-full bg-accent/20 -translate-x-1/2 -translate-y-1/2"></div>
          <div className="bg-decoration bottom-0 right-0 w-48 h-48 bg-secondary/10 rounded-lg"></div>

          <div className="flex justify-center mb-8">
            <div className="relative">
              <Circle className="h-16 w-16 text-accent" />
              <Square className="h-16 w-16 text-secondary absolute top-0 left-0 ml-8" />
              <Triangle className="h-16 w-16 text-muted-foreground absolute top-0 left-0 ml-4 mt-8" />
            </div>
          </div>

          <h2 className="text-5xl font-bold bauhaus-heading mb-6">
            Învață să desenezi portrete
            <span className="text-accent"> pas cu pas</span>
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Descoperă arta desenului de portrete prin lecții interactive, ghiduri vizuale și practică în timp real cu
            canvas-ul nostru digital.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              asChild={user ? true : false}
              size="lg"
              className="rounded-lg bauhaus-button"
              onClick={user ? undefined : () => setShowAuthModal(true)}
            >
              {user ? <Link href="/lessons">Începe să înveți</Link> : <span>Începe să înveți</span>}
            </Button>
            <Button
              asChild={user ? true : false}
              variant="outline"
              size="lg"
              className="rounded-lg bauhaus-button bg-transparent"
              onClick={user ? undefined : () => setShowAuthModal(true)}
            >
              {user ? <Link href="/practice">Practică acum</Link> : <span>Practică acum</span>}
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 bg-muted">
        <div className="bauhaus-container mx-auto content-layer">
          <h3 className="text-3xl font-bold text-center bauhaus-heading mb-12">De ce să alegi PortraitMaster?</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard
              title="Lecții structurate"
              description="Învață pas cu pas, de la bazele anatomiei faciale până la tehnici avansate de umbrire."
              icon={<BookOpen className="h-8 w-8 text-accent" />}
            />

            <FeatureCard
              title="Canvas interactiv"
              description="Desenează direct în browser cu instrumente digitale profesionale și ghiduri vizuale."
              icon={<Palette className="h-8 w-8 text-secondary" />}
            />

            <FeatureCard
              title="Comunitate activă"
              description="Împărtășește lucrările tale și primește feedback de la alți artiști din comunitate."
              icon={<Users className="h-8 w-8 text-accent" />}
            />

            <FeatureCard
              title="Progres urmărit"
              description="Monitorizează-ți progresul și câștigă insigne pe măsură ce îți dezvolți abilitățile."
              icon={<Award className="h-8 w-8 text-secondary" />}
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-accent text-accent-foreground">
        <div className="bauhaus-container mx-auto text-center content-layer">
          <h3 className="text-3xl font-bold bauhaus-heading mb-6">Gata să începi călătoria ta artistică?</h3>
          <p className="mb-8 max-w-2xl mx-auto">
            Alătură-te miilor de artiști care și-au dezvoltat abilitățile de desen cu PortraitMaster.
          </p>
          <Button
            asChild={user ? true : false}
            size="lg"
            variant="secondary"
            className="rounded-lg bauhaus-button"
            onClick={user ? undefined : () => setShowAuthModal(true)}
          >
            {user ? <Link href="/lessons">Începe prima lecție</Link> : <span>Începe prima lecție</span>}
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background border-t border-border py-12 px-4">
        <div className="bauhaus-container mx-auto content-layer">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-4 mb-4">
                <div className="flex items-center">
                  <Circle className="h-6 w-6 text-accent" />
                  <Square className="h-6 w-6 text-foreground absolute ml-3" />
                </div>
                <span className="text-xl font-bold bauhaus-heading">Portretify</span>
              </div>
              <p className="text-muted-foreground">Platforma educațională pentru învățarea desenului de portrete.</p>
            </div>
            <div>
              { /* */}
            </div>
          </div>
        </div>
      </footer>
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  )
}

function FeatureCard({ title, description, icon }: { title: string; description: string; icon: React.ReactNode }) {
  return (
    <Card className="text-center bauhaus-card border-none rounded-lg">
      <CardContent className="pt-6">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center bg-muted rounded-lg">{icon}</div>
        <h4 className="text-xl font-bold bauhaus-heading mb-2">{title}</h4>
        <p className="text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}
