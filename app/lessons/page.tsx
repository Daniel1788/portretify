"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { ArrowRight, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import Link from "next/link"
import Image from "next/image"
import { AuthGuard } from "@/components/auth-guard"
import { Navigation } from "@/components/navigation"

export default function LessonsPage() {
  const { user } = useAuth()
  const [lessons, setLessons] = useState<any[]>([])
  const [userProgress, setUserProgress] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      setLoading(false) // Setează loading la false imediat

      // Fetch lessons și user progress în paralel
      const lessonsPromise = supabase.from("lessons").select("*").eq("is_published", true).order("order_index")

      const promises = [lessonsPromise]

      if (user) {
        const progressPromise = supabase.from("user_progress").select("*").eq("user_id", user.id)
        promises.push(progressPromise)
      }

      try {
        const results = await Promise.all(promises)

        // Set lessons data
        if (!results[0].error && results[0].data) {
          setLessons(results[0].data)
        }

        // Set progress data if user exists
        if (user && results[1] && !results[1].error && results[1].data) {
          setUserProgress(results[1].data)
        }
      } catch (error) {
        console.error("Error loading data:", error)
      }
    }

    loadData()
  }, [user])

  const getProgressForLesson = (lessonId: number) => {
    const progress = userProgress.find((p) => p.lesson_id === lessonId)
    return progress?.progress_percentage || 0
  }

  const getCompletedLessons = () => {
    return userProgress.filter((p) => p.progress_percentage === 100).length
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        {/* Navigation */}
        <Navigation />

        <div className="bauhaus-container mx-auto px-4 py-8">
          {/* Page Header */}
          <div className="mb-12 relative">
            <div className="bg-decoration -top-4 -left-4 w-12 h-12 bg-accent/20 rounded-lg"></div>
            <h1 className="text-4xl font-bold bauhaus-heading mb-4 content-layer">Lecții de desen</h1>
            <p className="text-xl text-muted-foreground max-w-2xl content-layer">
              Parcurge lecțiile noastre structurate pentru a învăța pas cu pas cum să desenezi portrete realiste.
            </p>
          </div>

          {/* Progress Overview */}
          <Card className="mb-12 rounded-lg border-2 border-border">
            <CardHeader>
              <CardTitle className="bauhaus-heading">Progresul tău</CardTitle>
              <CardDescription>Urmărește-ți evoluția prin cursurile de desen</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Progres general</span>
                <span className="text-sm text-muted-foreground">
                  {getCompletedLessons()}/{lessons.length} lecții completate
                </span>
              </div>
              <Progress
                value={(getCompletedLessons() / Math.max(lessons.length, 1)) * 100}
                className="mb-8 h-2 rounded-lg"
              />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                <div>
                  <div className="text-3xl font-bold text-accent bauhaus-heading">{getCompletedLessons()}</div>
                  <div className="text-sm text-muted-foreground">Lecții completate</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-secondary bauhaus-heading">
                    {user
                      ? Math.round(
                          userProgress.reduce((acc, p) => acc + (p.progress_percentage || 0), 0) /
                            Math.max(lessons.length, 1),
                        )
                      : 0}
                    %
                  </div>
                  <div className="text-sm text-muted-foreground">Progres general</div>
                </div>
                <div>
                  <div className="text-3xl font-bold bauhaus-heading">0</div>
                  <div className="text-sm text-muted-foreground">Desene create</div>
                </div>
                <div>
                  <div className="text-3xl font-bold bauhaus-heading">0</div>
                  <div className="text-sm text-muted-foreground">Insigne câștigate</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lessons Grid */}
          {loading ? (
            <div className="text-center py-8">Se încarcă lecțiile...</div>
          ) : (
            <div className="bauhaus-grid">
              {lessons.map((lesson, index) => {
                const progress = getProgressForLesson(lesson.id)
                return (
                  <Card key={lesson.id} className="bauhaus-card rounded-lg border-2 border-border overflow-visible">
                    <div className="relative">
                      <Image
                        src={lesson.image_url || "/placeholder.svg"}
                        alt={lesson.title}
                        width={300}
                        height={200}
                        className="w-full h-48 object-cover rounded-t-lg"
                      />
                      <Badge
                        className="absolute top-2 right-2 rounded-lg"
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

                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg bauhaus-heading">{lesson.title}</CardTitle>
                      <CardDescription>{lesson.description}</CardDescription>
                    </CardHeader>

                    <CardContent>
                      <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4" />
                          <span>{lesson.duration} min</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Badge variant="outline" className="rounded-lg">
                            {lesson.difficulty}
                          </Badge>
                        </div>
                      </div>

                      {progress > 0 && (
                        <div className="mb-4">
                          <div className="flex justify-between text-sm mb-1">
                            <span>Progres</span>
                            <span>{progress}%</span>
                          </div>
                          <Progress value={progress} className="h-1 rounded-lg" />
                        </div>
                      )}

                      <Button asChild className="w-full rounded-lg bauhaus-button">
                        <Link href={user ? `/lessons/${lesson.id}` : "#"}>
                          {progress > 0 ? "Continuă lecția" : "Începe lecția"}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  )
}
