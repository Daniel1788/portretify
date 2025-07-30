"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Save,
  Users,
  BookOpen,
  FileText,
  Search,
  Filter,
  ArrowUpDown,
  AlertCircle,
  CheckCircle,
  Clock,
  User,
  Shield,
  Mail,
  Calendar,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth"
import { ProtectedRoute } from "@/components/protected-route"
import { useToast } from "@/hooks/use-toast"

interface Lesson {
  id: number
  title: string
  description: string
  difficulty: "Începător" | "Intermediar" | "Avansat"
  duration: number
  image_url: string | null
  order_index: number
  is_published: boolean
  created_at: string
  updated_at: string
}

interface LessonStep {
  id: number
  lesson_id: number
  title: string
  description: string
  content: string
  image_url: string | null
  duration: number
  order_index: number
  created_at: string
  updated_at: string
}

interface Profile {
  id: string
  email: string | null
  full_name: string | null
  avatar_url: string | null
  role: "user" | "admin"
  created_at: string
  updated_at: string
}

export default function AdminPage() {
  const { user, isAdmin, loading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  // State pentru lecții
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null)
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false)
  const [lessonsLoading, setLessonsLoading] = useState(true)

  // State pentru pași
  const [lessonSteps, setLessonSteps] = useState<LessonStep[]>([])
  const [editingStep, setEditingStep] = useState<LessonStep | null>(null)
  const [stepDialogOpen, setStepDialogOpen] = useState(false)
  const [selectedLessonForSteps, setSelectedLessonForSteps] = useState<number | null>(null)
  const [stepsLoading, setStepsLoading] = useState(false)

  // State pentru utilizatori
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [profilesLoading, setProfilesLoading] = useState(true)

  // State pentru căutare și filtrare
  const [searchTerm, setSearchTerm] = useState("")
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<"title" | "created_at" | "order_index">("order_index")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")

  // Loading și error states
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    if (isAdmin) {
      fetchLessons()
      fetchProfiles()
    }
  }, [isAdmin])

  // Fetch lecții
  const fetchLessons = async () => {
    try {
      setLessonsLoading(true)
      const { data, error } = await supabase.from("lessons").select("*").order("order_index", { ascending: true })

      if (error) throw error
      setLessons(data || [])
    } catch (error) {
      console.error("Error fetching lessons:", error)
      toast({
        title: "Eroare",
        description: "Nu s-au putut încărca lecțiile.",
        variant: "destructive",
      })
    } finally {
      setLessonsLoading(false)
    }
  }

  // Fetch pași pentru o lecție
  const fetchLessonSteps = async (lessonId: number) => {
    try {
      setStepsLoading(true)
      const { data, error } = await supabase
        .from("lesson_steps")
        .select("*")
        .eq("lesson_id", lessonId)
        .order("order_index", { ascending: true })

      if (error) throw error
      setLessonSteps(data || [])
      setSelectedLessonForSteps(lessonId)
    } catch (error) {
      console.error("Error fetching lesson steps:", error)
      toast({
        title: "Eroare",
        description: "Nu s-au putut încărca pașii lecției.",
        variant: "destructive",
      })
    } finally {
      setStepsLoading(false)
    }
  }

  // Fetch profiluri utilizatori
  const fetchProfiles = async () => {
    try {
      setProfilesLoading(true)
      const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false })

      if (error) throw error
      setProfiles(data || [])
    } catch (error) {
      console.error("Error fetching profiles:", error)
      toast({
        title: "Eroare",
        description: "Nu s-au putut încărca profilurile utilizatorilor.",
        variant: "destructive",
      })
    } finally {
      setProfilesLoading(false)
    }
  }

  // Salvare lecție
  const saveLesson = async (lessonData: Partial<Lesson>) => {
    try {
      setActionLoading(true)

      if (editingLesson?.id) {
        // Update
        const { error } = await supabase.from("lessons").update(lessonData).eq("id", editingLesson.id)

        if (error) throw error

        toast({
          title: "Succes",
          description: "Lecția a fost actualizată cu succes.",
          variant: "success",
        })
      } else {
        // Insert
        const { error } = await supabase.from("lessons").insert(lessonData)

        if (error) throw error

        toast({
          title: "Succes",
          description: "Lecția a fost creată cu succes.",
          variant: "success",
        })
      }

      await fetchLessons()
      setLessonDialogOpen(false)
      setEditingLesson(null)
    } catch (error) {
      console.error("Error saving lesson:", error)
      toast({
        title: "Eroare",
        description: "Nu s-a putut salva lecția.",
        variant: "destructive",
      })
    } finally {
      setActionLoading(false)
    }
  }

  // Ștergere lecție
  const deleteLesson = async (id: number) => {
    if (!confirm("Ești sigur că vrei să ștergi această lecție? Această acțiune va șterge și toți pașii asociați.")) {
      return
    }

    try {
      setActionLoading(true)

      // Șterge mai întâi pașii
      const { error: stepsError } = await supabase.from("lesson_steps").delete().eq("lesson_id", id)

      if (stepsError) throw stepsError

      // Apoi șterge lecția
      const { error } = await supabase.from("lessons").delete().eq("id", id)

      if (error) throw error

      toast({
        title: "Succes",
        description: "Lecția a fost ștearsă cu succes.",
        variant: "success",
      })

      await fetchLessons()
    } catch (error) {
      console.error("Error deleting lesson:", error)
      toast({
        title: "Eroare",
        description: "Nu s-a putut șterge lecția.",
        variant: "destructive",
      })
    } finally {
      setActionLoading(false)
    }
  }

  // Toggle vizibilitate lecție
  const toggleLessonVisibility = async (id: number, currentStatus: boolean) => {
    try {
      setActionLoading(true)

      const { error } = await supabase.from("lessons").update({ is_published: !currentStatus }).eq("id", id)

      if (error) throw error

      toast({
        title: "Succes",
        description: `Lecția a fost ${!currentStatus ? "publicată" : "ascunsă"} cu succes.`,
        variant: "success",
      })

      await fetchLessons()
    } catch (error) {
      console.error("Error toggling lesson visibility:", error)
      toast({
        title: "Eroare",
        description: "Nu s-a putut actualiza vizibilitatea lecției.",
        variant: "destructive",
      })
    } finally {
      setActionLoading(false)
    }
  }

  // Salvare pas lecție
  const saveLessonStep = async (stepData: Partial<LessonStep>) => {
    try {
      setActionLoading(true)

      if (editingStep?.id) {
        // Update
        const { error } = await supabase.from("lesson_steps").update(stepData).eq("id", editingStep.id)

        if (error) throw error

        toast({
          title: "Succes",
          description: "Pasul a fost actualizat cu succes.",
          variant: "success",
        })
      } else {
        // Insert
        const { error } = await supabase.from("lesson_steps").insert(stepData)

        if (error) throw error

        toast({
          title: "Succes",
          description: "Pasul a fost creat cu succes.",
          variant: "success",
        })
      }

      if (selectedLessonForSteps) {
        await fetchLessonSteps(selectedLessonForSteps)
      }
      setStepDialogOpen(false)
      setEditingStep(null)
    } catch (error) {
      console.error("Error saving lesson step:", error)
      toast({
        title: "Eroare",
        description: "Nu s-a putut salva pasul.",
        variant: "destructive",
      })
    } finally {
      setActionLoading(false)
    }
  }

  // Ștergere pas lecție
  const deleteLessonStep = async (id: number) => {
    if (!confirm("Ești sigur că vrei să ștergi acest pas?")) {
      return
    }

    try {
      setActionLoading(true)

      const { error } = await supabase.from("lesson_steps").delete().eq("id", id)

      if (error) throw error

      toast({
        title: "Succes",
        description: "Pasul a fost șters cu succes.",
        variant: "success",
      })

      if (selectedLessonForSteps) {
        await fetchLessonSteps(selectedLessonForSteps)
      }
    } catch (error) {
      console.error("Error deleting lesson step:", error)
      toast({
        title: "Eroare",
        description: "Nu s-a putut șterge pasul.",
        variant: "destructive",
      })
    } finally {
      setActionLoading(false)
    }
  }

  // Actualizare rol utilizator
  const updateUserRole = async (userId: string, newRole: "user" | "admin") => {
    try {
      setActionLoading(true)

      const { error } = await supabase.from("profiles").update({ role: newRole }).eq("id", userId)

      if (error) throw error

      toast({
        title: "Succes",
        description: `Rolul utilizatorului a fost actualizat la ${newRole}.`,
        variant: "success",
      })

      await fetchProfiles()
    } catch (error) {
      console.error("Error updating user role:", error)
      toast({
        title: "Eroare",
        description: "Nu s-a putut actualiza rolul utilizatorului.",
        variant: "destructive",
      })
    } finally {
      setActionLoading(false)
    }
  }

  // Filtrare și sortare lecții
  const filteredAndSortedLessons = lessons
    .filter((lesson) => {
      const matchesSearch =
        lesson.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lesson.description.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesDifficulty = difficultyFilter === "all" || lesson.difficulty === difficultyFilter
      return matchesSearch && matchesDifficulty
    })
    .sort((a, b) => {
      let aValue: any = a[sortBy]
      let bValue: any = b[sortBy]

      if (sortBy === "created_at") {
        aValue = new Date(aValue).getTime()
        bValue = new Date(bValue).getTime()
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Se încarcă...</p>
        </div>
      </div>
    )
  }

  return (
    <ProtectedRoute requireAuth={true} adminOnly={true}>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="bg-card border-b border-border sticky top-0 z-40">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold bauhaus-heading">Admin Panel - Portretify</h1>
                <p className="text-muted-foreground">Gestionează conținutul și utilizatorii platformei</p>
              </div>
              <Button variant="outline" onClick={() => router.push("/")}>
                Înapoi la site
              </Button>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          <Tabs defaultValue="lessons" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="lessons" className="flex items-center space-x-2">
                <BookOpen className="h-4 w-4" />
                <span>Lecții</span>
              </TabsTrigger>
              <TabsTrigger value="steps" className="flex items-center space-x-2">
                <FileText className="h-4 w-4" />
                <span>Pași lecții</span>
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span>Utilizatori</span>
              </TabsTrigger>
            </TabsList>

            {/* Tab Lecții */}
            <TabsContent value="lessons" className="space-y-6">
              {/* Header și controale */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-bold bauhaus-heading">Gestionare Lecții</h2>
                  <p className="text-muted-foreground">
                    {lessons.length} lecții totale, {lessons.filter((l) => l.is_published).length} publicate
                  </p>
                </div>

                <Dialog open={lessonDialogOpen} onOpenChange={setLessonDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      onClick={() => {
                        setEditingLesson(null)
                        setLessonDialogOpen(true)
                      }}
                      className="flex items-center space-x-2"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Lecție nouă</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{editingLesson ? "Editează lecția" : "Lecție nouă"}</DialogTitle>
                    </DialogHeader>
                    <LessonForm
                      lesson={editingLesson}
                      onSave={saveLesson}
                      onCancel={() => {
                        setLessonDialogOpen(false)
                        setEditingLesson(null)
                      }}
                      loading={actionLoading}
                    />
                  </DialogContent>
                </Dialog>
              </div>

              {/* Filtre și căutare */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Caută lecții..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                      <SelectTrigger className="w-full sm:w-48">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Filtrează după dificultate" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toate dificultățile</SelectItem>
                        <SelectItem value="Începător">Începător</SelectItem>
                        <SelectItem value="Intermediar">Intermediar</SelectItem>
                        <SelectItem value="Avansat">Avansat</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select
                      value={`${sortBy}-${sortOrder}`}
                      onValueChange={(value) => {
                        const [field, order] = value.split("-")
                        setSortBy(field as any)
                        setSortOrder(order as any)
                      }}
                    >
                      <SelectTrigger className="w-full sm:w-48">
                        <ArrowUpDown className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Sortează" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="order_index-asc">Ordine (crescător)</SelectItem>
                        <SelectItem value="order_index-desc">Ordine (descrescător)</SelectItem>
                        <SelectItem value="title-asc">Titlu (A-Z)</SelectItem>
                        <SelectItem value="title-desc">Titlu (Z-A)</SelectItem>
                        <SelectItem value="created_at-desc">Cel mai recent</SelectItem>
                        <SelectItem value="created_at-asc">Cel mai vechi</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Lista lecții */}
              {lessonsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Se încarcă lecțiile...</p>
                  </div>
                </div>
              ) : filteredAndSortedLessons.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Nu s-au găsit lecții</h3>
                    <p className="text-muted-foreground mb-4">
                      {searchTerm || difficultyFilter !== "all"
                        ? "Încearcă să modifici filtrele de căutare."
                        : "Începe prin a crea prima lecție."}
                    </p>
                    {!searchTerm && difficultyFilter === "all" && (
                      <Button
                        onClick={() => {
                          setEditingLesson(null)
                          setLessonDialogOpen(true)
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Creează prima lecție
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-6">
                  {filteredAndSortedLessons.map((lesson) => (
                    <Card key={lesson.id} className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <CardTitle className="text-xl">{lesson.title}</CardTitle>
                              <Badge variant={lesson.is_published ? "default" : "secondary"}>
                                {lesson.is_published ? "Publicată" : "Ascunsă"}
                              </Badge>
                              <Badge variant="outline">#{lesson.order_index}</Badge>
                            </div>
                            <CardDescription className="text-base mb-3">{lesson.description}</CardDescription>
                            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                              <div className="flex items-center space-x-1">
                                <Badge
                                  variant={
                                    lesson.difficulty === "Începător"
                                      ? "default"
                                      : lesson.difficulty === "Intermediar"
                                        ? "secondary"
                                        : "destructive"
                                  }
                                >
                                  {lesson.difficulty}
                                </Badge>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Clock className="h-4 w-4" />
                                <span>{lesson.duration} min</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Calendar className="h-4 w-4" />
                                <span>{new Date(lesson.created_at).toLocaleDateString("ro-RO")}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 ml-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleLessonVisibility(lesson.id, lesson.is_published)}
                              disabled={actionLoading}
                            >
                              {lesson.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingLesson(lesson)
                                setLessonDialogOpen(true)
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteLesson(lesson.id)}
                              disabled={actionLoading}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Tab Pași lecții */}
            <TabsContent value="steps" className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-bold bauhaus-heading">Gestionare Pași</h2>
                  <p className="text-muted-foreground">Gestionează pașii pentru fiecare lecție</p>
                </div>

                <Select
                  value={selectedLessonForSteps?.toString() || ""}
                  onValueChange={(value) => value && fetchLessonSteps(Number.parseInt(value))}
                >
                  <SelectTrigger className="w-full sm:w-80">
                    <SelectValue placeholder="Selectează o lecție pentru a vedea pașii" />
                  </SelectTrigger>
                  <SelectContent>
                    {lessons.map((lesson) => (
                      <SelectItem key={lesson.id} value={lesson.id.toString()}>
                        {lesson.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedLessonForSteps ? (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-semibold">
                        Pași pentru: {lessons.find((l) => l.id === selectedLessonForSteps)?.title}
                      </h3>
                      <p className="text-muted-foreground">{lessonSteps.length} pași configurați</p>
                    </div>

                    <Dialog open={stepDialogOpen} onOpenChange={setStepDialogOpen}>
                      <DialogTrigger asChild>
                        <Button
                          onClick={() => {
                            setEditingStep(null)
                            setStepDialogOpen(true)
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Pas nou
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>{editingStep ? "Editează pasul" : "Pas nou"}</DialogTitle>
                        </DialogHeader>
                        <StepForm
                          step={editingStep}
                          lessonId={selectedLessonForSteps}
                          onSave={saveLessonStep}
                          onCancel={() => {
                            setStepDialogOpen(false)
                            setEditingStep(null)
                          }}
                          loading={actionLoading}
                        />
                      </DialogContent>
                    </Dialog>
                  </div>

                  {stepsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-4"></div>
                        <p className="text-muted-foreground">Se încarcă pașii...</p>
                      </div>
                    </div>
                  ) : lessonSteps.length === 0 ? (
                    <Card>
                      <CardContent className="py-12 text-center">
                        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Nu există pași configurați</h3>
                        <p className="text-muted-foreground mb-4">
                          Începe prin a crea primul pas pentru această lecție.
                        </p>
                        <Button
                          onClick={() => {
                            setEditingStep(null)
                            setStepDialogOpen(true)
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Creează primul pas
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid gap-4">
                      {lessonSteps.map((step, index) => (
                        <Card key={step.id} className="hover:shadow-md transition-shadow">
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-3 mb-2">
                                  <Badge variant="outline">Pas {step.order_index}</Badge>
                                  <CardTitle className="text-lg">{step.title}</CardTitle>
                                </div>
                                <CardDescription className="mb-3">{step.description}</CardDescription>
                                <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-3">
                                  <div className="flex items-center space-x-1">
                                    <Clock className="h-4 w-4" />
                                    <span>{step.duration} min</span>
                                  </div>
                                  {step.image_url && (
                                    <div className="flex items-center space-x-1">
                                      <CheckCircle className="h-4 w-4 text-green-600" />
                                      <span>Are imagine</span>
                                    </div>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-2">{step.content}</p>
                              </div>

                              <div className="flex items-center space-x-2 ml-4">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setEditingStep(step)
                                    setStepDialogOpen(true)
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>

                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => deleteLessonStep(step.id)}
                                  disabled={actionLoading}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                        </Card>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Selectează o lecție</h3>
                    <p className="text-muted-foreground">
                      Alege o lecție din dropdown-ul de mai sus pentru a vedea și gestiona pașii săi.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Tab Utilizatori */}
            <TabsContent value="users" className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold bauhaus-heading mb-2">Gestionare Utilizatori</h2>
                <p className="text-muted-foreground">
                  {profiles.length} utilizatori înregistrați, {profiles.filter((p) => p.role === "admin").length}{" "}
                  administratori
                </p>
              </div>

              {profilesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Se încarcă utilizatorii...</p>
                  </div>
                </div>
              ) : profiles.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Nu există utilizatori</h3>
                    <p className="text-muted-foreground">Nu s-au găsit utilizatori înregistrați în sistem.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {profiles.map((profile) => (
                    <Card key={profile.id} className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center">
                              <User className="h-6 w-6 text-accent" />
                            </div>
                            <div>
                              <div className="flex items-center space-x-2 mb-1">
                                <h3 className="font-semibold">{profile.full_name || "Nume necunoscut"}</h3>
                                <Badge variant={profile.role === "admin" ? "default" : "secondary"}>
                                  {profile.role === "admin" ? (
                                    <>
                                      <Shield className="h-3 w-3 mr-1" />
                                      Admin
                                    </>
                                  ) : (
                                    <>
                                      <User className="h-3 w-3 mr-1" />
                                      Utilizator
                                    </>
                                  )}
                                </Badge>
                              </div>
                              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                <div className="flex items-center space-x-1">
                                  <Mail className="h-4 w-4" />
                                  <span>{profile.email}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <Calendar className="h-4 w-4" />
                                  <span>Înregistrat: {new Date(profile.created_at).toLocaleDateString("ro-RO")}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            {profile.id !== user?.id && (
                              <Select
                                value={profile.role}
                                onValueChange={(newRole: "user" | "admin") => updateUserRole(profile.id, newRole)}
                                disabled={actionLoading}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="user">Utilizator</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                            {profile.id === user?.id && <Badge variant="outline">Tu</Badge>}
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </ProtectedRoute>
  )
}

// Componenta pentru formularul de lecție
function LessonForm({
  lesson,
  onSave,
  onCancel,
  loading,
}: {
  lesson: Lesson | null
  onSave: (data: Partial<Lesson>) => void
  onCancel: () => void
  loading: boolean
}) {
  const [formData, setFormData] = useState({
    title: lesson?.title || "",
    description: lesson?.description || "",
    difficulty: lesson?.difficulty || ("Începător" as const),
    duration: lesson?.duration || 60,
    image_url: lesson?.image_url || "",
    order_index: lesson?.order_index || 1,
    is_published: lesson?.is_published ?? true,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) {
      newErrors.title = "Titlul este obligatoriu"
    }

    if (!formData.description.trim()) {
      newErrors.description = "Descrierea este obligatorie"
    }

    if (formData.duration < 1) {
      newErrors.duration = "Durata trebuie să fie cel puțin 1 minut"
    }

    if (formData.order_index < 0) {
      newErrors.order_index = "Ordinea trebuie să fie un număr pozitiv"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    onSave(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Label htmlFor="title">Titlu *</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="ex: Desenarea ochilor"
            className={errors.title ? "border-red-500" : ""}
          />
          {errors.title && (
            <p className="text-sm text-red-600 mt-1 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.title}
            </p>
          )}
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="description">Descriere *</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Descriere detaliată a lecției..."
            rows={3}
            className={errors.description ? "border-red-500" : ""}
          />
          {errors.description && (
            <p className="text-sm text-red-600 mt-1 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.description}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="difficulty">Dificultate</Label>
          <Select
            value={formData.difficulty}
            onValueChange={(value: "Începător" | "Intermediar" | "Avansat") =>
              setFormData({ ...formData, difficulty: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Începător">Începător</SelectItem>
              <SelectItem value="Intermediar">Intermediar</SelectItem>
              <SelectItem value="Avansat">Avansat</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="duration">Durată (minute) *</Label>
          <Input
            id="duration"
            type="number"
            value={formData.duration}
            onChange={(e) => setFormData({ ...formData, duration: Number.parseInt(e.target.value) || 0 })}
            min="1"
            className={errors.duration ? "border-red-500" : ""}
          />
          {errors.duration && (
            <p className="text-sm text-red-600 mt-1 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.duration}
            </p>
          )}
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="image_url">URL imagine</Label>
          <Input
            id="image_url"
            value={formData.image_url}
            onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
            placeholder="https://example.com/image.jpg sau /placeholder.svg?text=..."
          />
          <p className="text-xs text-muted-foreground mt-1">
            Opțional. Poți folosi URL-uri externe sau placeholder-uri cu text personalizat.
          </p>
        </div>

        <div>
          <Label htmlFor="order_index">Ordine *</Label>
          <Input
            id="order_index"
            type="number"
            value={formData.order_index}
            onChange={(e) => setFormData({ ...formData, order_index: Number.parseInt(e.target.value) || 0 })}
            min="0"
            className={errors.order_index ? "border-red-500" : ""}
          />
          {errors.order_index && (
            <p className="text-sm text-red-600 mt-1 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.order_index}
            </p>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="is_published"
            checked={formData.is_published}
            onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
            className="rounded border-border"
          />
          <Label htmlFor="is_published">Publicată (vizibilă pentru utilizatori)</Label>
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Anulează
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Salvează...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Salvează
            </>
          )}
        </Button>
      </div>
    </form>
  )
}

// Componenta pentru formularul de pas
function StepForm({
  step,
  lessonId,
  onSave,
  onCancel,
  loading,
}: {
  step: LessonStep | null
  lessonId: number
  onSave: (data: Partial<LessonStep>) => void
  onCancel: () => void
  loading: boolean
}) {
  const [formData, setFormData] = useState({
    lesson_id: lessonId,
    title: step?.title || "",
    description: step?.description || "",
    content: step?.content || "",
    image_url: step?.image_url || "",
    duration: step?.duration || 10,
    order_index: step?.order_index || 1,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) {
      newErrors.title = "Titlul este obligatoriu"
    }

    if (!formData.description.trim()) {
      newErrors.description = "Descrierea este obligatorie"
    }

    if (!formData.content.trim()) {
      newErrors.content = "Conținutul este obligatoriu"
    }

    if (formData.duration < 1) {
      newErrors.duration = "Durata trebuie să fie cel puțin 1 minut"
    }

    if (formData.order_index < 1) {
      newErrors.order_index = "Ordinea trebuie să fie cel puțin 1"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    onSave(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Label htmlFor="step-title">Titlu pas *</Label>
          <Input
            id="step-title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="ex: Desenarea irisului"
            className={errors.title ? "border-red-500" : ""}
          />
          {errors.title && (
            <p className="text-sm text-red-600 mt-1 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.title}
            </p>
          )}
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="step-description">Descriere scurtă *</Label>
          <Textarea
            id="step-description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Descriere scurtă a pasului..."
            rows={2}
            className={errors.description ? "border-red-500" : ""}
          />
          {errors.description && (
            <p className="text-sm text-red-600 mt-1 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.description}
            </p>
          )}
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="step-content">Conținut detaliat *</Label>
          <Textarea
            id="step-content"
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            placeholder="Instrucțiuni detaliate pentru acest pas..."
            rows={6}
            className={errors.content ? "border-red-500" : ""}
          />
          {errors.content && (
            <p className="text-sm text-red-600 mt-1 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.content}
            </p>
          )}
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="step-image">URL imagine de referință</Label>
          <Input
            id="step-image"
            value={formData.image_url}
            onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
            placeholder="/placeholder.svg?height=400&width=600&text=Desenarea+Irisului"
          />
          <p className="text-xs text-muted-foreground mt-1">
            <strong>Important:</strong> Această imagine va fi disponibilă ca referință în pagina de practică.
          </p>
        </div>

        <div>
          <Label htmlFor="step-duration">Durată estimată (minute) *</Label>
          <Input
            id="step-duration"
            type="number"
            value={formData.duration}
            onChange={(e) => setFormData({ ...formData, duration: Number.parseInt(e.target.value) || 0 })}
            min="1"
            className={errors.duration ? "border-red-500" : ""}
          />
          {errors.duration && (
            <p className="text-sm text-red-600 mt-1 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.duration}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="step-order">Ordinea pasului *</Label>
          <Input
            id="step-order"
            type="number"
            value={formData.order_index}
            onChange={(e) => setFormData({ ...formData, order_index: Number.parseInt(e.target.value) || 0 })}
            min="1"
            className={errors.order_index ? "border-red-500" : ""}
          />
          {errors.order_index && (
            <p className="text-sm text-red-600 mt-1 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.order_index}
            </p>
          )}
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Anulează
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Salvează...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Salvează
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
