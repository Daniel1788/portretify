"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { ArrowLeft, ArrowRight, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import Image from "next/image"
import { AuthGuard } from "@/components/auth-guard"
import { Navigation } from "@/components/navigation"

export default function LessonDetailPage({ params }: { params: { id: string } }) {
  const { user } = useAuth()
  const [lesson, setLesson] = useState<any>(null)
  const [lessonSteps, setLessonSteps] = useState<any[]>([])
  const [userProgress, setUserProgress] = useState<any>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLesson()
  }, [params.id])

  useEffect(() => {
    if (user && lesson) {
      fetchUserProgress()
    }
  }, [user, lesson])

  const fetchLesson = async () => {
    const { data: lessonData, error: lessonError } = await supabase
      .from("lessons")
      .select("*")
      .eq("id", params.id)
      .single()

    if (!lessonError && lessonData) {
      setLesson(lessonData)
    }

    const { data: stepsData, error: stepsError } = await supabase
      .from("lesson_steps")
      .select("*")
      .eq("lesson_id", params.id)
      .order("order_index")

    if (!stepsError && stepsData) {
      setLessonSteps(stepsData)
    }

    setLoading(false)
  }

  const fetchUserProgress = async () => {
    if (!user || !lesson) return

    const { data, error } = await supabase
      .from("user_progress")
      .select("*")
      .eq("user_id", user.id)
      .eq("lesson_id", lesson.id)
      .single()

    if (!error && data) {
      setUserProgress(data)
      setCompletedSteps(data.completed_steps || [])
    }
  }

  const updateProgress = async (stepIndex: number) => {
    if (!user || !lesson) return

    const newCompletedSteps = [...new Set([...completedSteps, stepIndex])]
    const progressPercentage = Math.round((newCompletedSteps.length / lessonSteps.length) * 100)

    const progressData = {
      user_id: user.id,
      lesson_id: lesson.id,
      completed_steps: newCompletedSteps,
      progress_percentage: progressPercentage,
      completed_at: progressPercentage === 100 ? new Date().toISOString() : null,
    }

    if (userProgress) {
      await supabase.from("user_progress").update(progressData).eq("id", userProgress.id)
    } else {
      await supabase.from("user_progress").insert(progressData)
    }

    setCompletedSteps(newCompletedSteps)
    setUserProgress({ ...userProgress, ...progressData })
  }

  const handleStepComplete = () => {
    if (!completedSteps.includes(currentStep)) {
      updateProgress(currentStep)
    }
  }

  const progress = ((currentStep + 1) / lessonSteps.length) * 100

  const handleNextStep = () => {
    if (currentStep < lessonSteps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Se încarcă lecția...</div>
  }

  if (!lesson || lessonSteps.length === 0) {
    return <div className="flex items-center justify-center min-h-screen">Lecția nu a fost găsită.</div>
  }

  const currentStepData = lessonSteps[currentStep]

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        {/* Navigation */}
        <Navigation />

        {/* Lesson Header */}
        <header className="bg-background border-b border-border sticky top-16 z-40">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/lessons">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Înapoi la lecții
                  </Link>
                </Button>
                <div>
                  <h1 className="text-xl font-bold text-foreground">{lesson.title}</h1>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Badge variant="secondary">{lesson.difficulty}</Badge>
                    <span>•</span>
                    <span>{lesson.duration} min</span>
                  </div>
                </div>
              </div>
              <Button asChild>
                <Link href="/practice">Practică acum</Link>
              </Button>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              {/* Progress */}
              <Card className="mb-6">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Progres lecție</span>
                    <span className="text-sm text-gray-500">
                      Pasul {currentStep + 1} din {lessonSteps.length}
                    </span>
                  </div>
                  <Progress value={progress} className="mb-4" />
                  <div className="flex items-center justify-between">
                    <Button variant="outline" size="sm" onClick={handlePrevStep} disabled={currentStep === 0}>
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Anterior
                    </Button>
                    <Button onClick={handleNextStep} disabled={currentStep === lessonSteps.length - 1}>
                      Următorul
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Current Step */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-2xl">{currentStepData.title}</CardTitle>
                      <CardDescription className="text-lg mt-2">{currentStepData.description}</CardDescription>
                    </div>
                    <Badge variant="outline">{currentStepData.duration}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-6">
                    <Image
                      src={currentStepData.image_url || "/placeholder.svg"}
                      alt={currentStepData.title}
                      width={600}
                      height={400}
                      className="w-full rounded-lg border"
                    />
                  </div>
                  <div className="prose max-w-none">
                    <p className="text-foreground leading-relaxed text-lg">{currentStepData.content}</p>
                  </div>
                  <div className="mt-6 flex items-center justify-between">
                    <Button
                      variant="outline"
                      onClick={handleStepComplete}
                      disabled={completedSteps.includes(currentStep)}
                    >
                      {completedSteps.includes(currentStep) ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Completat
                        </>
                      ) : (
                        "Marchează ca completat"
                      )}
                    </Button>
                    <Button asChild>
                      <Link
                        href={`/practice?lesson=${lesson.id}&step=${currentStep}&stepTitle=${encodeURIComponent(currentStepData.title)}`}
                      >
                        Practică acest pas
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Steps Overview */}
              <Card>
                <CardHeader>
                  <CardTitle>Pașii lecției</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {lessonSteps.map((step, index) => (
                      <div
                        key={step.id}
                        className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors ${
                          index === currentStep
                            ? "bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700"
                            : completedSteps.includes(index)
                              ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700"
                              : "hover:bg-gray-50 dark:hover:bg-gray-800 border border-transparent"
                        }`}
                        onClick={() => setCurrentStep(index)}
                      >
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                            index === currentStep
                              ? "bg-purple-600 text-white"
                              : completedSteps.includes(index)
                                ? "bg-green-600 text-white"
                                : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                          }`}
                        >
                          {completedSteps.includes(index) ? <Check className="h-4 w-4" /> : index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{step.title}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{step.duration}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Tips */}
              <Card>
                <CardHeader>
                  <CardTitle>Sfaturi utile</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="font-medium text-blue-900">💡 Sfat</p>
                      <p className="text-blue-700">
                        Folosește linii ușoare la început. Poți întări contururile mai târziu.
                      </p>
                    </div>
                    <div className="p-3 bg-yellow-50 rounded-lg">
                      <p className="font-medium text-yellow-900">⚠️ Atenție</p>
                      <p className="text-yellow-700">
                        Nu te grăbi cu detaliile. Concentrează-te pe proporții mai întâi.
                      </p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg">
                      <p className="font-medium text-green-900">✅ Recomandare</p>
                      <p className="text-green-700">
                        Practică fiecare pas de mai multe ori înainte de a trece la următorul.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}
