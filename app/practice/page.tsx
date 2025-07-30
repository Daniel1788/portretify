"use client"

import type React from "react"

import { useRef, useEffect, useState, useCallback } from "react"
import { Brush, Eraser, Undo, Download, Trash2, Settings, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import { AuthGuard } from "@/components/auth-guard"
import { Navigation } from "@/components/navigation"
import { useAuth } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectSeparator,
  SelectLabel,
  SelectGroup,
} from "@/components/ui/select"

interface Point {
  x: number
  y: number
  pressure?: number
}

interface Path {
  points: Point[]
  color: string
  size: number
  tool: string
}

export default function PracticePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const contextRef = useRef<CanvasRenderingContext2D | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [canvasReady, setCanvasReady] = useState(false)
  const [tool, setTool] = useState<"pencil" | "eraser">("pencil")
  const [brushSize, setBrushSize] = useState([1])
  const [brushColor, setBrushColor] = useState("#000000")
  const [showReference, setShowReference] = useState(true)
  const [referenceImage, setReferenceImage] = useState("face-proportions")
  const [paths, setPaths] = useState<Path[]>([])
  const [currentPath, setCurrentPath] = useState<Point[]>([])
  const [pressureSupport, setPressureSupport] = useState(false)

  const { user } = useAuth()
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState("")

  const [startTime, setStartTime] = useState<number | null>(null)
  const [totalTimeSpent, setTotalTimeSpent] = useState(0) // in seconds
  const [lastActivityTime, setLastActivityTime] = useState<number | null>(null)
  const [isTimerActive, setIsTimerActive] = useState(false)

  const [selectedLesson, setSelectedLesson] = useState<any>(null)
  const [selectedStep, setSelectedStep] = useState<any>(null)
  const [lessons, setLessons] = useState<any[]>([])
  const [lessonSteps, setLessonSteps] = useState<any[]>([])

  const referenceImages = [
    {
      id: "face-proportions",
      name: "Proporții faciale",
      url: "https://d2culxnxbccemt.cloudfront.net/craft/content/uploads/2013/06/11170631/drawing-faces-diagram.png",
    },
    {
      id: "eye-structure",
      name: "Structura ochilor",
      url: "https://artfulhaven.com/wp-content/uploads/2020/04/FACE-PROPORTIONS7.jpg",
    },
    { id: "nose-angles", name: "Unghiuri nas", url: "https://artlot.weebly.com/uploads/5/3/3/6/53368813/4387590_orig.gif" },
    { id: "mouth-expressions", name: "Expresii gură", url: "https://www.clipstudio.net/wp-content/uploads/2019/12/0050_007.jpg" },
    // Add lesson steps as reference images
    ...lessonSteps.map((step, index) => ({
      id: `lesson-${selectedLesson?.id}-step-${index}`,
      name: `${selectedLesson?.title} - ${step.title}`,
      url: step.image_url || "/placeholder.svg?height=400&width=300&text=" + encodeURIComponent(step.title),
    })),
  ]

  useEffect(() => {
    const loadLessons = async () => {
      const { data, error } = await supabase.from("lessons").select("*").eq("is_published", true).order("order_index")

      if (!error && data) {
        setLessons(data)
      }
    }

    loadLessons()

    // Handle URL parameters for lesson and step
    const urlParams = new URLSearchParams(window.location.search)
    const lessonId = urlParams.get("lesson")
    const stepIndex = urlParams.get("step")

    if (lessonId) {
      loadLessonSteps(Number.parseInt(lessonId))
      if (stepIndex) {
        // Will be set after steps are loaded
      }
    }
  }, [])

  const loadLessonSteps = async (lessonId: number) => {
    const { data: lessonData } = await supabase.from("lessons").select("*").eq("id", lessonId).single()

    const { data: stepsData } = await supabase
      .from("lesson_steps")
      .select("*")
      .eq("lesson_id", lessonId)
      .order("order_index")

    if (lessonData) setSelectedLesson(lessonData)
    if (stepsData) {
      setLessonSteps(stepsData)

      // Handle step selection from URL
      const urlParams = new URLSearchParams(window.location.search)
      const stepIndex = urlParams.get("step")
      if (stepIndex && stepsData[Number.parseInt(stepIndex)]) {
        setSelectedStep(stepsData[Number.parseInt(stepIndex)])
        setReferenceImage(`lesson-${lessonId}-step-${stepIndex}`)
      }
    }
  }

  // Smooth line drawing cu Bezier curves
  const drawSmoothLine = useCallback(
    (context: CanvasRenderingContext2D, points: Point[], color: string, size: number, toolType: string) => {
      if (points.length < 2) return

      context.strokeStyle = toolType === "eraser" ? "white" : color
      context.globalCompositeOperation = toolType === "eraser" ? "destination-out" : "source-over"

      context.beginPath()
      context.moveTo(points[0].x, points[0].y)

      if (points.length === 2) {
        // Pentru doar 2 puncte, desenează o linie simplă
        context.lineTo(points[1].x, points[1].y)
      } else {
        // Pentru mai multe puncte, folosește quadratic curves pentru smoothness
        for (let i = 1; i < points.length - 1; i++) {
          const currentPoint = points[i]
          const nextPoint = points[i + 1]

          // Calculează punctul de control pentru curba
          const controlX = (currentPoint.x + nextPoint.x) / 2
          const controlY = (currentPoint.y + nextPoint.y) / 2

          context.quadraticCurveTo(currentPoint.x, currentPoint.y, controlX, controlY)
        }

        // Adaugă ultimul punct
        const lastPoint = points[points.length - 1]
        context.lineTo(lastPoint.x, lastPoint.y)
      }

      // Aplică pressure sensitivity dacă este disponibilă
      if (pressureSupport && points[0].pressure !== undefined) {
        const avgPressure = points.reduce((sum, p) => sum + (p.pressure || 0.5), 0) / points.length
        context.lineWidth = size * (0.3 + avgPressure * 0.7) // Variază între 30% și 100% din mărime
      } else {
        context.lineWidth = size
      }

      context.stroke()
    },
    [pressureSupport],
  )

  // Redraw toate path-urile
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const context = contextRef.current
    if (!canvas || !context || !canvasReady) {
      return
    }


    // Clear canvas
    context.fillStyle = "white"
    context.fillRect(0, 0, canvas.width, canvas.height)

    // Redraw toate path-urile SALVATE cu smooth lines
    paths.forEach((path, index) => {
      if (path.points.length > 0) {
        drawSmoothLine(context, path.points, path.color, path.size, path.tool)
      }
    })

  }, [paths, canvasReady, drawSmoothLine])

  // Inițializează canvas-ul - versiune simplificată fără dependențe circulare
  const initializeCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }


    // Calculează dimensiunile
    const container = canvas.parentElement
    const containerWidth = container?.clientWidth || 800
    // Mărește dimensiunile canvas-ului
    const maxWidth = Math.min(containerWidth - 32, 1000) // Crescut de la 800 la 1000
    const canvasWidth = maxWidth
    const canvasHeight = (canvasWidth * 700) / 800 // Crescut înălțimea de la 600 la 700


    // Setează dimensiunile canvas-ului
    canvas.width = canvasWidth
    canvas.height = canvasHeight
    canvas.style.width = canvasWidth + "px"
    canvas.style.height = canvasHeight + "px"

    // Obține contextul
    const context = canvas.getContext("2d")
    if (!context) {
      return
    }

    // Configurează contextul pentru smooth drawing
    context.lineCap = "round"
    context.lineJoin = "round"
    context.imageSmoothingEnabled = true
    context.strokeStyle = brushColor
    context.lineWidth = brushSize[0]
    context.fillStyle = "white"
    context.fillRect(0, 0, canvas.width, canvas.height)

    contextRef.current = context
    setCanvasReady(true)

  }, [brushColor, brushSize]) // Elimină paths și redrawCanvas din dependențe

  // Inițializează canvas-ul la mount - versiune simplificată
  useEffect(() => {

    const timer = setTimeout(() => {
      initializeCanvas()
    }, 100)

    return () => {
      clearTimeout(timer)
    }
  }, []) // Array gol - rulează doar la mount

  // Effect separat pentru redraw când paths se schimbă
  useEffect(() => {
    if (!canvasReady || paths.length === 0) return

    const canvas = canvasRef.current
    const context = contextRef.current
    if (!canvas || !context) return

    // Clear canvas
    context.fillStyle = "white"
    context.fillRect(0, 0, canvas.width, canvas.height)

    // Redraw toate path-urile SALVATE cu smooth lines
    paths.forEach((path, index) => {
      if (path.points.length > 0) {
        drawSmoothLine(context, path.points, path.color, path.size, path.tool)
      }
    })
  }, [paths, canvasReady, drawSmoothLine])

  // Actualizează setările brush-ului
  useEffect(() => {
    const context = contextRef.current
    if (!context || !canvasReady) return

    context.strokeStyle = tool === "eraser" ? "white" : brushColor
    context.lineWidth = brushSize[0]
    context.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over"
  }, [tool, brushColor, brushSize, canvasReady])

  // Timer logic - tracks actual drawing time
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (isTimerActive && startTime) {
      interval = setInterval(() => {
        const now = Date.now()
        if (lastActivityTime && now - lastActivityTime > 30000) {
          // Stop timer if no activity for 30 seconds
          setIsTimerActive(false)
          setStartTime(null)
        } else {
          // Update total time spent
          setTotalTimeSpent((prev) => prev + 1)
        }
      }, 1000)
    }

    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [isTimerActive, startTime, lastActivityTime])


  // Redraw path-ul curent când se schimbă
  useEffect(() => {
    if (!canvasReady || !isDrawing || currentPath.length === 0) return

    const canvas = canvasRef.current
    const context = contextRef.current
    if (!canvas || !context) return

    // Redraw tot (paths + current path)
    context.fillStyle = "white"
    context.fillRect(0, 0, canvas.width, canvas.height)

    // Redraw paths salvate
    paths.forEach((path) => {
      if (path.points.length > 0) {
        drawSmoothLine(context, path.points, path.color, path.size, path.tool)
      }
    })

    // Redraw current path
    drawSmoothLine(context, currentPath, brushColor, brushSize[0], tool)
  }, [currentPath, canvasReady, isDrawing, paths, brushColor, brushSize, tool, drawSmoothLine])

  // Obține coordonatele și pressure din event
  const getPointerInfo = (e: React.PointerEvent<HTMLCanvasElement> | React.MouseEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    const point: Point = {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }

    // Adaugă pressure dacă este disponibilă (pentru stylus/tabletă)
    if ("pressure" in e && e.pressure > 0) {
      point.pressure = e.pressure
      if (!pressureSupport) {
        setPressureSupport(true)
      }
    } else {
      point.pressure = 0.5 // Pressure default pentru mouse
    }

    return point
  }

  // Pointer events (suportă mouse, touch, stylus)
  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const point = getPointerInfo(e)
    // Start timer if not already active
    const now = Date.now()
    if (!isTimerActive) {
      setStartTime(now)
      setIsTimerActive(true)
    }
    setLastActivityTime(now)

    setIsDrawing(true)
    setCurrentPath([point])
  }

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return

    const point = getPointerInfo(e)

    // Update last activity time
    setLastActivityTime(Date.now())

    setCurrentPath((prev) => {
      const newPath = [...prev, point]

      // Limitează numărul de puncte pentru performanță
      if (newPath.length > 1000) {
        return newPath.slice(-500) // Păstrează ultimele 500 de puncte
      }

      return newPath
    })
  }

  const stopDrawing = () => {
    if (!isDrawing) return

    setIsDrawing(false)

    // Salvează path-ul curent în paths
    if (currentPath.length > 0) {
      const newPath: Path = {
        points: [...currentPath],
        color: brushColor,
        size: brushSize[0],
        tool: tool,
      }

      setPaths((prev) => [...prev, newPath])
      setCurrentPath([])
    }
  }

  // Mouse events ca fallback
  const startDrawingMouse = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const point = getPointerInfo(e)

    // Start timer if not already active
    const now = Date.now()
    if (!isTimerActive) {
      setStartTime(now)
      setIsTimerActive(true)
    }
    setLastActivityTime(now)

    setIsDrawing(true)
    setCurrentPath([point])
  }

  const drawMouse = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return

    const point = getPointerInfo(e)

    // Update last activity time
    setLastActivityTime(Date.now())

    setCurrentPath((prev) => [...prev, point])
  }

  const stopDrawingMouse = () => {
    if (!isDrawing) return

    setIsDrawing(false)

    if (currentPath.length > 0) {
      const newPath: Path = {
        points: [...currentPath],
        color: brushColor,
        size: brushSize[0],
        tool: tool,
      }

      setPaths((prev) => [...prev, newPath])
      setCurrentPath([])
    }
  }

  // Actions
  const clearCanvas = () => {
    setPaths([])
    setCurrentPath([])

    // Reset timer
    setTotalTimeSpent(0)
    setStartTime(null)
    setIsTimerActive(false)
    setLastActivityTime(null)

    const canvas = canvasRef.current
    const context = contextRef.current
    if (canvas && context) {
      context.fillStyle = "white"
      context.fillRect(0, 0, canvas.width, canvas.height)
    }
  }

  const undo = () => {
    setPaths((prev) => prev.slice(0, -1))
  }

  const downloadCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) {
      toast({
        title: "Eroare la descărcare",
        description: "Nu există canvas disponibil pentru descărcare.",
        variant: "destructive",
      })
      return
    }

    try {
      // Creează un canvas temporar cu fundal alb pentru download
      const tempCanvas = document.createElement("canvas")
      const tempContext = tempCanvas.getContext("2d")

      if (!tempContext) {
        toast({
          title: "Eroare la descărcare",
          description: "Nu s-a putut crea contextul pentru descărcare.",
          variant: "destructive",
        })
        return
      }

      tempCanvas.width = canvas.width
      tempCanvas.height = canvas.height

      // Adaugă fundal alb
      tempContext.fillStyle = "white"
      tempContext.fillRect(0, 0, tempCanvas.width, tempCanvas.height)

      // Desenează canvas-ul original peste fundal
      tempContext.drawImage(canvas, 0, 0)

      // Descarcă imaginea
      const dataURL = tempCanvas.toDataURL("image/png", 1.0)
      const link = document.createElement("a")
      link.download = `portret-${new Date().toISOString().slice(0, 10)}.png`
      link.href = dataURL
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: "Descărcare reușită",
        description: "Desenul a fost descărcat cu succes pe dispozitivul tău.",
        variant: "success",
      })
    } catch (error) {
      console.error("Error downloading canvas:", error)
      toast({
        title: "Eroare la descărcare",
        description: "Nu s-a putut descărca desenul. Te rugăm să încerci din nou.",
        variant: "destructive",
      })
    }
  }

  const saveArtwork = async () => {
    if (!user) {
      toast({
        title: "Acces interzis",
        description: "Trebuie să fii conectat pentru a salva desenul.",
        variant: "destructive",
      })
      return
    }

    const canvas = canvasRef.current
    if (!canvas) {
      toast({
        title: "Eroare la salvare",
        description: "Nu există desen de salvat.",
        variant: "destructive",
      })
      return
    }

    // Verifică dacă există conținut pe canvas
    if (paths.length === 0) {
      toast({
        title: "Canvas gol",
        description: "Desenează ceva înainte de a salva.",
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    setSaveSuccess(false)
    setSaveError("")

    try {
      // Verifică conexiunea la Supabase
      const { data: testData, error: testError } = await supabase.auth.getUser()
      if (testError) {
        throw new Error(`Auth error: ${testError.message}`)
      }

      // Creează un canvas temporar cu fundal alb pentru salvare
      const tempCanvas = document.createElement("canvas")
      const tempContext = tempCanvas.getContext("2d")

      if (!tempContext) {
        throw new Error("Could not create temporary canvas context")
      }

      tempCanvas.width = canvas.width
      tempCanvas.height = canvas.height

      // Adaugă fundal alb
      tempContext.fillStyle = "white"
      tempContext.fillRect(0, 0, tempCanvas.width, tempCanvas.height)

      // Desenează canvas-ul original peste fundal
      tempContext.drawImage(canvas, 0, 0)

      // Convertește la blob pentru upload
      const blob = await new Promise<Blob>((resolve, reject) => {
        tempCanvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error("Could not create image blob"))
            }
          },
          "image/png",
          0.9,
        )
      })


      // Generează un nume unic pentru fișier
      const fileName = `artwork_${user.id}_${Date.now()}.png`
      const filePath = `artworks/${fileName}`

      // Upload imaginea în Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage.from("artworks").upload(filePath, blob, {
        contentType: "image/png",
        upsert: false,
      })

      if (uploadError) {
        console.error("Storage upload error:", uploadError)
        throw new Error(`Storage upload failed: ${uploadError.message}`)
      }


      // Obține URL-ul public al imaginii
      const { data: urlData } = supabase.storage.from("artworks").getPublicUrl(filePath)

      if (!urlData?.publicUrl) {
        throw new Error("Could not get public URL for uploaded image")
      }


      const timeSpentMinutes = Math.max(1, Math.ceil(totalTimeSpent / 60))

      // Pregătește datele pentru inserare
      const artworkData = {
        user_id: user.id,
        title: `Portret ${new Date().toLocaleDateString("ro-RO")}`,
        image_url: urlData.publicUrl,
        technique: tool === "pencil" ? "Digital" : "Mixed",
        time_spent: timeSpentMinutes,
        is_public: true,
      }


      // Salvează metadata în baza de date
      const { data: insertData, error: dbError } = await supabase.from("artworks").insert(artworkData).select()

      if (dbError) {
        console.error("Database insert error:", dbError)
        throw new Error(`Database insert failed: ${dbError.message}`)
      }


      setSaveSuccess(true)

      toast({
        title: "Desen salvat",
        description: "Desenul tău a fost salvat cu succes în galerie!",
        variant: "success",
      })

      // Resetează mesajul de succes după 3 secunde
      setTimeout(() => {
        setSaveSuccess(false)
      }, 3000)
    } catch (error) {
      console.error("Error saving artwork:", error)
      const errorMessage = error instanceof Error ? error.message : "Eroare necunoscută la salvarea desenului"
      setSaveError(errorMessage)

      toast({
        title: "Eroare la salvare",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const testCanvas = () => {
    const canvas = canvasRef.current
    const context = contextRef.current
    if (!canvas || !context) {
      return
    }

    // Test cu o curbă smooth
    const testPoints: Point[] = []
    for (let i = 0; i <= 100; i++) {
      const x = 50 + i * 3
      const y = 150 + Math.sin(i * 0.1) * 50
      testPoints.push({ x, y, pressure: 0.5 + Math.sin(i * 0.05) * 0.3 })
    }

    drawSmoothLine(context, testPoints, "red", 5, "pencil")

    // Test cu un cerc smooth
    const circlePoints: Point[] = []
    for (let i = 0; i <= 360; i += 5) {
      const angle = (i * Math.PI) / 180
      const x = 300 + Math.cos(angle) * 50
      const y = 200 + Math.sin(angle) * 50
      circlePoints.push({ x, y, pressure: 0.3 + (Math.sin(i * 0.02) + 1) * 0.35 })
    }

    drawSmoothLine(context, circlePoints, "blue", 8, "pencil")

  }

  const forceReinitialize = () => {
    setCanvasReady(false)
    setPaths([])
    setCurrentPath([])
    setTimeout(() => {
      initializeCanvas()
    }, 100)
  }

  const currentReference = referenceImages.find((img) => img.id === referenceImage)

  const debugPaths = () => {
    paths.forEach((path, index) => {
      
    })

    // Forțează redraw manual
    if (canvasReady) {
      redrawCanvas()
    }
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        {/* Navigation */}
        <Navigation />

        <div className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-foreground bauhaus-heading mb-2">Zonă de practică</h1>
            <p className="text-muted-foreground">
              Desenează cu linii smooth și suport pentru tabletă grafică cu pressure sensitivity.
            </p>
          </div>

          <div className="grid lg:grid-cols-4 gap-6">
            {/* Tools Panel */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="h-5 w-5" />
                  <span>Instrumente</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Debug Info */}
                {/* Time Tracking Display */}
                <div className="text-sm text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span>Timp desenare:</span>
                    <span className="font-medium">
                      {Math.floor(totalTimeSpent / 60)}:{(totalTimeSpent % 60).toString().padStart(2, "0")}
                    </span>
                  </div>
                  {isTimerActive && (
                    <div className="flex items-center space-x-1 text-green-600">
                      <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
                      <span className="text-xs">Activ</span>
                    </div>
                  )}
                </div>

                {/* Control Buttons */}
                <div className="space-y-2"></div>

                {/* Tool Selection */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Instrument</label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant={tool === "pencil" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTool("pencil")}
                      className="flex items-center space-x-2"
                    >
                      <Brush className="h-4 w-4" />
                      <span>Pensulă</span>
                    </Button>
                    <Button
                      variant={tool === "eraser" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTool("eraser")}
                      className="flex items-center space-x-2"
                    >
                      <Eraser className="h-4 w-4" />
                      <span>Gumă</span>
                    </Button>
                  </div>
                </div>

                {/* Brush Size */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Mărime {tool === "eraser" ? "gumă" : "pensulă"}: {brushSize[0]}px
                  </label>
                  <Slider value={brushSize} onValueChange={setBrushSize} max={50} min={1} step={1} />
                  {pressureSupport && (
                    <p className="text-xs text-muted-foreground mt-1">* Mărimea variază cu presiunea stylus-ului</p>
                  )}
                </div>

                {/* Color Picker */}
                {tool === "pencil" && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">Culoare</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={brushColor}
                        onChange={(e) => setBrushColor(e.target.value)}
                        className="w-12 h-8 rounded border border-border bg-background"
                      />
                      <div className="flex space-x-1">
                        {["#000000", "#666666", "#999999", "#CCCCCC", "#FF0000", "#00FF00", "#0000FF"].map((color) => (
                          <button
                            key={color}
                            onClick={() => setBrushColor(color)}
                            className="w-6 h-6 rounded border-2 border-border hover:scale-110 transition-transform"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="space-y-2">
                  <Button variant="outline" size="sm" onClick={undo} className="w-full bg-transparent">
                    <Undo className="h-4 w-4 mr-2" />
                    Anulează
                  </Button>
                  <Button variant="outline" size="sm" onClick={clearCanvas} className="w-full bg-transparent">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Șterge tot
                  </Button>
                  <Button onClick={downloadCanvas} variant="outline" size="sm" className="w-full bg-transparent">
                    <Download className="h-4 w-4 mr-2" />
                    Descarcă
                  </Button>
                  <Button onClick={saveArtwork} className="w-full" disabled={saving || !user || paths.length === 0}>
                    {saving ? (
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
                  {!user && (
                    <p className="text-xs text-muted-foreground text-center">Conectează-te pentru a salva desenele</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Canvas Area */}
            <div className="lg:col-span-2">
              <Card>
                <CardContent className="p-4">
                  <div className="relative">
                    {!canvasReady && (
                      <div className="absolute inset-0 bg-gray-100 rounded-lg flex items-center justify-center z-10">
                        <div className="text-center">
                          <div className="animate-spin rounded-lg h-8 w-8 border-b-2 border-accent mx-auto mb-2"></div>
                          <p className="text-sm text-muted-foreground">Inițializare canvas...</p>
                        </div>
                      </div>
                    )}
                    <canvas
                      ref={canvasRef}
                      className="border-2 border-gray-300 rounded-lg bg-white block cursor-crosshair touch-none"
                      style={{
                        maxWidth: "100%",
                        height: "auto",
                        minHeight: "500px", // Crescut de la implicit la 500px minim
                      }}
                      // Pointer events (suportă stylus, touch, mouse)
                      onPointerDown={startDrawing}
                      onPointerMove={draw}
                      onPointerUp={stopDrawing}
                      onPointerLeave={stopDrawing}
                      // Mouse events ca fallback
                      onMouseDown={startDrawingMouse}
                      onMouseMove={drawMouse}
                      onMouseUp={stopDrawingMouse}
                      onMouseLeave={stopDrawingMouse}
                    />
                    <div className="absolute top-2 right-2 flex space-x-2">
                      <Badge variant="secondary">
                        {tool === "pencil" ? "Pensulă" : "Gumă"} - {brushSize[0]}px
                      </Badge>
                      {pressureSupport && <Badge variant="default">Pressure ✅</Badge>}
                      {canvasReady && <Badge variant="default">Smooth Ready</Badge>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Reference Panel */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Referință</CardTitle>
                  <CardDescription>Selectează o imagine de referință pentru practică</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Reference Image Selector */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Imagine de referință</label>
                    <Select value={referenceImage} onValueChange={setReferenceImage}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selectează referința" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="face-proportions">Proporții faciale</SelectItem>
                        <SelectItem value="eye-structure">Structura ochilor</SelectItem>
                        <SelectItem value="nose-angles">Unghiuri nas</SelectItem>
                        <SelectItem value="mouth-expressions">Expresii gură</SelectItem>
                        {selectedLesson && lessonSteps.length > 0 && (
                          <>
                            <SelectSeparator />
                            <SelectGroup>
                              <SelectLabel>{selectedLesson.title}</SelectLabel>
                              {lessonSteps.map((step, index) => (
                                <SelectItem key={step.id} value={`lesson-${selectedLesson.id}-step-${index}`}>
                                  Pas {index + 1}: {step.title}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Show/Hide Reference Toggle */}
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Afișează referința</label>
                    <Button
                      variant={showReference ? "default" : "outline"}
                      size="sm"
                      onClick={() => setShowReference(!showReference)}
                    >
                      {showReference ? "Vizibilă" : "Ascunsă"}
                    </Button>
                  </div>

                  {/* Reference Image Display */}
                  {showReference && currentReference && (
                    <div className="mt-4">
                      <Image
                        src={currentReference.url || "/placeholder.svg"}
                        alt={currentReference.name}
                        width={300}
                        height={400}
                        className="w-full rounded-lg border"
                      />
                      <p className="text-xs text-muted-foreground mt-2 text-center">{currentReference.name}</p>
                    </div>
                  )}

                  {/* Step Instructions if available */}
                  {selectedStep && (
                    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Instrucțiuni pas</h4>
                      <p className="text-sm text-blue-700 dark:text-blue-200">{selectedStep.description}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}
