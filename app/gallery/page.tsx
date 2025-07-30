"use client"

import { useState, useEffect } from "react"
import { Download, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
// Remove the Tabs import
import Image from "next/image"
import { AuthGuard } from "@/components/auth-guard"
import { Navigation } from "@/components/navigation"
import { useAuth } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

interface Artwork {
  id: number
  title: string
  image_url: string
  technique: string
  time_spent: number
  likes_count: number
  views_count: number
  is_public: boolean
  created_at: string
  user_id: string
  profiles: {
    full_name: string
    email: string
  }
}

export default function GalleryPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [allArtworks, setAllArtworks] = useState<Artwork[]>([])
  const [userArtworks, setUserArtworks] = useState<Artwork[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchArtworks()
  }, [user])

  const fetchArtworks = async () => {
    try {
      // Fetch toate lucrările publice cu informații despre utilizatori
      const { data: publicArtworks, error: publicError } = await supabase
        .from("artworks")
        .select(`
          *,
          profiles (
            full_name,
            email
          )
        `)
        .eq("is_public", true)
        .order("created_at", { ascending: false })

      if (publicError) {
        console.error("Error fetching public artworks:", publicError)
      } else {
        setAllArtworks(publicArtworks || [])
      }

      // Fetch lucrările utilizatorului curent (dacă este conectat)
      if (user) {
        const { data: userArtworks, error: userError } = await supabase
          .from("artworks")
          .select(`
            *,
            profiles (
              full_name,
              email
            )
          `)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })

        if (userError) {
          console.error("Error fetching user artworks:", userError)
        } else {
          setUserArtworks(userArtworks || [])
        }
      }
    } catch (error) {
      console.error("Error in fetchArtworks:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatTimeSpent = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`
    }
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ro-RO", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  // Remove the getFilteredArtworks function entirely.

  const downloadArtwork = async (imageUrl: string, title: string) => {
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast({
        title: "Descărcare reușită",
        description: `Lucrarea "${title}" a fost descărcată cu succes.`,
        variant: "success",
      })
    } catch (error) {
      console.error("Error downloading artwork:", error)
      toast({
        title: "Eroare la descărcare",
        description: "Nu s-a putut descărca lucrarea. Te rugăm să încerci din nou.",
        variant: "destructive",
      })
    }
  }

  const deleteArtwork = async (artworkId: number, imageUrl: string, title: string) => {
    if (!user) {
      toast({
        title: "Acces interzis",
        description: "Trebuie să fii conectat pentru a șterge lucrarea.",
        variant: "destructive",
      })
      return
    }

    if (!confirm("Ești sigur că vrei să ștergi această lucrare? Această acțiune nu poate fi anulată.")) {
      return
    }

    try {
      // Extract file path from URL for storage deletion
      const urlParts = imageUrl.split("/")
      const fileName = urlParts[urlParts.length - 1]
      const filePath = `artworks/${fileName}`

      // Delete from storage
      const { error: storageError } = await supabase.storage.from("artworks").remove([filePath])

      if (storageError) {
        console.error("Error deleting from storage:", storageError)
      }

      // Delete from database
      const { error: dbError } = await supabase.from("artworks").delete().eq("id", artworkId).eq("user_id", user.id) // Ensure user can only delete their own artworks

      if (dbError) {
        throw new Error(`Database delete failed: ${dbError.message}`)
      }

      // Refresh the artworks list
      fetchArtworks()

      toast({
        title: "Lucrare ștearsă",
        description: `Lucrarea "${title}" a fost ștearsă cu succes.`,
        variant: "success",
      })
    } catch (error) {
      console.error("Error deleting artwork:", error)
      toast({
        title: "Eroare la ștergere",
        description: "Nu s-a putut șterge lucrarea. Te rugăm să încerci din nou.",
        variant: "destructive",
      })
    }
  }

  // Remove the techniques array:

  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-background">
          <Navigation />
          <div className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <div className="animate-spin rounded-lg h-8 w-8 border-b-2 border-accent mx-auto mb-4"></div>
                <p className="text-muted-foreground">Se încarcă galeria...</p>
              </div>
            </div>
          </div>
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        <Navigation />

        <div className="container mx-auto px-4 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground bauhaus-heading mb-4">Galeria comunității</h1>
            <p className="text-xl text-muted-foreground max-w-2xl">
              Descoperă lucrările create de membrii comunității noastre și inspiră-te pentru propriile desene.
            </p>
          </div>

          {/* Gallery Grid */}
          {allArtworks.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg">Nu există încă lucrări în galerie.</p>
              <Button asChild className="mt-4">
                <a href="/practice">Creează prima lucrare</a>
              </Button>
            </div>
          ) : (
            <ArtworkGrid
              artworks={allArtworks}
              currentUser={user}
              onDownload={downloadArtwork}
              onDelete={deleteArtwork}
              formatTimeSpent={formatTimeSpent}
              formatDate={formatDate}
            />
          )}

          {/* Community Stats */}
        </div>
      </div>
    </AuthGuard>
  )
}

function ArtworkGrid({
  artworks,
  currentUser,
  onDownload,
  onDelete,
  formatTimeSpent,
  formatDate,
  showPrivate = false,
}: {
  artworks: Artwork[]
  currentUser: any
  onDownload: (imageUrl: string, title: string) => void
  onDelete: (artworkId: number, imageUrl: string, title: string) => void
  formatTimeSpent: (minutes: number) => string
  formatDate: (dateString: string) => string
  showPrivate?: boolean
}) {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {artworks.map((artwork) => (
        <Card key={artwork.id} className="hover:shadow-lg transition-shadow bauhaus-card">
          <div className="relative">
            <Image
              src={artwork.image_url || "/placeholder.svg"}
              alt={artwork.title}
              width={300}
              height={400}
              className="w-full h-64 object-cover rounded-t-lg"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.src = "/placeholder.svg?height=400&width=300&text=Imagine+Indisponibila"
              }}
            />
          </div>

          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg bauhaus-heading">{artwork.title}</CardTitle>
              <span className="text-sm text-muted-foreground">{formatTimeSpent(artwork.time_spent || 0)}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs bg-accent/10 text-accent">
                  {artwork.profiles?.full_name
                    ?.split(" ")
                    .map((n) => n[0])
                    .join("") || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm text-foreground">{artwork.profiles?.full_name || "Utilizator anonim"}</span>
                <span className="text-xs text-muted-foreground">{formatDate(artwork.created_at)}</span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-0">
            <div className="flex justify-center space-x-2">
              <Button variant="outline" size="sm" onClick={() => onDownload(artwork.image_url, artwork.title)}>
                <Download className="h-4 w-4 mr-2" />
                Descarcă
              </Button>
              {currentUser && currentUser.id === artwork.user_id && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete(artwork.id, artwork.image_url, artwork.title)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
