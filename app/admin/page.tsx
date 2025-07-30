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
import { Plus, Edit, Trash2, Eye, EyeOff, Save, X } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth"
import { ProtectedRoute } from "@/components/protected-route"

export default function AdminPage() {
  const { user, isAdmin, loading } = useAuth()
  const router = useRouter()
  const [adminPassword, setAdminPassword] = useState("")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [lessons, setLessons] = useState<any[]>([])
  const [editingLesson, setEditingLesson] = useState<any>(null)
  const [editingStep, setEditingStep] = useState<any>(null)
  const [lessonSteps, setLessonSteps] = useState<any[]>([])

  useEffect(() => {
    if (isAuthenticated) {
      fetchLessons()
    }
  }, [isAuthenticated])

  const handleAdminAuth = () => {
    const correctPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "admin123"
    if (adminPassword === correctPassword) {
      setIsAuthenticated(true)
    } else {
      alert("Parolă incorectă!")
    }
  }

  const fetchLessons = async () => {
    const { data, error } = await supabase.from("lessons").select("*").order("order_index")

    if (!error && data) {
      setLessons(data)
    }
  }

  const fetchLessonSteps = async (lessonId: number) => {
    const { data, error } = await supabase
      .from("lesson_steps")
      .select("*")
      .eq("lesson_id", lessonId)
      .order("order_index")

    if (!error && data) {
      setLessonSteps(data)
    }
  }

  const saveLesson = async (lessonData: any) => {
    if (editingLesson?.id) {
      // Update existing lesson
      const { error } = await supabase.from("lessons").update(lessonData).eq("id", editingLesson.id)

      if (!error) {
        fetchLessons()
        setEditingLesson(null)
      }
    } else {
      // Create new lesson
      const { error } = await supabase.from("lessons").insert(lessonData)

      if (!error) {
        fetchLessons()
        setEditingLesson(null)
      }
    }
  }

  const deleteLesson = async (id: number) => {
    if (confirm("Ești sigur că vrei să ștergi această lecție?")) {
      const { error } = await supabase.from("lessons").delete().eq("id", id)

      if (!error) {
        fetchLessons()
      }
    }
  }

  const toggleLessonVisibility = async (id: number, isPublished: boolean) => {
    const { error } = await supabase.from("lessons").update({ is_published: !isPublished }).eq("id", id)

    if (!error) {
      fetchLessons()
    }
  }

  const saveLessonStep = async (stepData: any) => {
    if (editingStep?.id) {
      // Update existing step
      const { error } = await supabase.from("lesson_steps").update(stepData).eq("id", editingStep.id)

      if (!error) {
        fetchLessonSteps(stepData.lesson_id)
        setEditingStep(null)
      }
    } else {
      // Create new step
      const { error } = await supabase.from("lesson_steps").insert(stepData)

      if (!error) {
        fetchLessonSteps(stepData.lesson_id)
        setEditingStep(null)
      }
    }
  }

  const deleteStep = async (id: number, lessonId: number) => {
    if (confirm("Ești sigur că vrei să ștergi acest pas?")) {
      const { error } = await supabase.from("lesson_steps").delete().eq("id", id)

      if (!error) {
        fetchLessonSteps(lessonId)
      }
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Se încarcă...</div>
  }

  return (
    <ProtectedRoute requireAuth={true} adminOnly={true}>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">Admin Panel - PortraitMaster</h1>
              <Button variant="outline" onClick={() => router.push("/")}>
                Înapoi la site
              </Button>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          <Tabs defaultValue="lessons" className="space-y-6">
            <TabsList>
              <TabsTrigger value="lessons">Lecții</TabsTrigger>
              <TabsTrigger value="steps">Pași lecții</TabsTrigger>
              <TabsTrigger value="users">Utilizatori</TabsTrigger>
            </TabsList>

            <TabsContent value="lessons" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold">Gestionare Lecții</h2>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button onClick={() => setEditingLesson({})}>
                      <Plus className="mr-2 h-4 w-4" />
                      Lecție nouă
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>{editingLesson?.id ? "Editează lecția" : "Lecție nouă"}</DialogTitle>
                    </DialogHeader>
                    <LessonForm lesson={editingLesson} onSave={saveLesson} onCancel={() => setEditingLesson(null)} />
                  </DialogContent>
                </Dialog>
              </div>

              <div className="grid gap-6">
                {lessons.map((lesson) => (
                  <Card key={lesson.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            {lesson.title}
                            <Badge variant={lesson.is_published ? "default" : "secondary"}>
                              {lesson.is_published ? "Publicată" : "Ascunsă"}
                            </Badge>
                          </CardTitle>
                          <CardDescription>{lesson.description}</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleLessonVisibility(lesson.id, lesson.is_published)}
                          >
                            {lesson.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" onClick={() => setEditingLesson(lesson)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Editează lecția</DialogTitle>
                              </DialogHeader>
                              <LessonForm
                                lesson={editingLesson}
                                onSave={saveLesson}
                                onCancel={() => setEditingLesson(null)}
                              />
                            </DialogContent>
                          </Dialog>
                          <Button variant="outline" size="sm" onClick={() => deleteLesson(lesson.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>Dificultate: {lesson.difficulty}</span>
                        <span>Durată: {lesson.duration} min</span>
                        <span>Ordine: {lesson.order_index}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="steps" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold">Gestionare Pași</h2>
                <Select onValueChange={(value) => fetchLessonSteps(Number.parseInt(value))}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Selectează o lecție" />
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

              {lessonSteps.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold">Pașii pentru lecția selectată ({lessonSteps.length} pași)</h3>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button onClick={() => setEditingStep({ lesson_id: lessonSteps[0]?.lesson_id })}>
                          <Plus className="mr-2 h-4 w-4" />
                          Pas nou
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Pas nou</DialogTitle>
                        </DialogHeader>
                        <StepForm step={editingStep} onSave={saveLessonStep} onCancel={() => setEditingStep(null)} />
                      </DialogContent>
                    </Dialog>
                  </div>

                  {lessonSteps.map((step) => (
                    <Card key={step.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle>{step.title}</CardTitle>
                            <CardDescription>{step.description}</CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm" onClick={() => setEditingStep(step)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>Editează pasul</DialogTitle>
                                </DialogHeader>
                                <StepForm
                                  step={editingStep}
                                  onSave={saveLessonStep}
                                  onCancel={() => setEditingStep(null)}
                                />
                              </DialogContent>
                            </Dialog>
                            <Button variant="outline" size="sm" onClick={() => deleteStep(step.id, step.lesson_id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                          <span>Durată: {step.duration} min</span>
                          <span>Ordine: {step.order_index}</span>
                        </div>
                        <p className="text-sm text-gray-700 line-clamp-3">{step.content}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="users">
              <h2 className="text-3xl font-bold mb-6">Gestionare Utilizatori</h2>
              <p className="text-gray-600">
                Funcționalitatea pentru gestionarea utilizatorilor va fi implementată aici.
              </p>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </ProtectedRoute>
  )
}

function LessonForm({ lesson, onSave, onCancel }: any) {
  const [formData, setFormData] = useState({
    title: lesson?.title || "",
    description: lesson?.description || "",
    difficulty: lesson?.difficulty || "Începător",
    duration: lesson?.duration || 60,
    image_url: lesson?.image_url || "",
    order_index: lesson?.order_index || 1,
    is_published: lesson?.is_published ?? true,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Titlu</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descriere</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="difficulty">Dificultate</Label>
          <Select
            value={formData.difficulty}
            onValueChange={(value) => setFormData({ ...formData, difficulty: value })}
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

        <div className="space-y-2">
          <Label htmlFor="duration">Durată (minute)</Label>
          <Input
            id="duration"
            type="number"
            value={formData.duration}
            onChange={(e) => setFormData({ ...formData, duration: Number.parseInt(e.target.value) })}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="image_url">URL imagine</Label>
        <Input
          id="image_url"
          value={formData.image_url}
          onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="order_index">Ordine</Label>
        <Input
          id="order_index"
          type="number"
          value={formData.order_index}
          onChange={(e) => setFormData({ ...formData, order_index: Number.parseInt(e.target.value) })}
          required
        />
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="is_published"
          checked={formData.is_published}
          onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
        />
        <Label htmlFor="is_published">Publicată</Label>
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="mr-2 h-4 w-4" />
          Anulează
        </Button>
        <Button type="submit">
          <Save className="mr-2 h-4 w-4" />
          Salvează
        </Button>
      </div>
    </form>
  )
}

function StepForm({ step, onSave, onCancel }: any) {
  const [formData, setFormData] = useState({
    lesson_id: step?.lesson_id || 0,
    title: step?.title || "",
    description: step?.description || "",
    content: step?.content || "",
    image_url: step?.image_url || "",
    duration: step?.duration || 10,
    order_index: step?.order_index || 1,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="step-title">Titlu</Label>
        <Input
          id="step-title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="step-description">Descriere</Label>
        <Textarea
          id="step-description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="step-content">Conținut</Label>
        <Textarea
          id="step-content"
          value={formData.content}
          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          rows={6}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="step-image">URL imagine</Label>
        <Input
          id="step-image"
          value={formData.image_url}
          onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="step-duration">Durată (minute)</Label>
          <Input
            id="step-duration"
            type="number"
            value={formData.duration}
            onChange={(e) => setFormData({ ...formData, duration: Number.parseInt(e.target.value) })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="step-order">Ordine</Label>
          <Input
            id="step-order"
            type="number"
            value={formData.order_index}
            onChange={(e) => setFormData({ ...formData, order_index: Number.parseInt(e.target.value) })}
            required
          />
        </div>
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="mr-2 h-4 w-4" />
          Anulează
        </Button>
        <Button type="submit">
          <Save className="mr-2 h-4 w-4" />
          Salvează
        </Button>
      </div>
    </form>
  )
}
