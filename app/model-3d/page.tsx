"use client"

import type React from "react"

import { useRef, useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { RotateCcw, Move3D, Eye, Grid3X3, Lightbulb, AlertCircle } from "lucide-react"
import { AuthGuard } from "@/components/auth-guard"
import { Navigation } from "@/components/navigation"
import { Brush, Eraser, Undo, Download, Trash2, SplitSquareHorizontal } from "lucide-react"
import { useAuth } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"

export default function Model3DPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadingError, setLoadingError] = useState<string | null>(null)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [rotationSpeed, setRotationSpeed] = useState([1])
  const [autoRotate, setAutoRotate] = useState(false)
  const [showWireframe, setShowWireframe] = useState(false)
  const [showGrid, setShowGrid] = useState(true)
  const [lightIntensity, setLightIntensity] = useState([1])
  const [splitViewMode, setSplitViewMode] = useState(false)
  const [drawingTool, setDrawingTool] = useState<"pencil" | "eraser">("pencil")
  const [brushSize, setBrushSize] = useState([1])
  const [brushColor, setBrushColor] = useState("#000000")
  const [paths, setPaths] = useState<any[]>([])
  const [currentPath, setCurrentPath] = useState<any[]>([])
  const [isDrawing, setIsDrawing] = useState(false)
  const [canvasReady, setCanvasReady] = useState(false)

  const { user } = useAuth()
  const { toast } = useToast()
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null)
  const drawingContextRef = useRef<CanvasRenderingContext2D | null>(null)

  useEffect(() => {
    let scene: any, camera: any, renderer: any, headModel: any, controls: any, gridHelper: any, directionalLight: any
    let animationId: number

    const initThreeJS = async () => {
      try {
        // Import Three.js dynamically with correct paths
        const THREE = await import("three")
        const { OrbitControls } = await import("three/addons/controls/OrbitControls.js")
        const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js")

        const canvas = canvasRef.current
        if (!canvas) return

        // Scene setup
        scene = new THREE.Scene()
        scene.background = new THREE.Color(0xf5f5f5)

        // Camera setup
        camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000)
        camera.position.set(0, 3, 3)

        // Renderer setup
        renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
        renderer.setSize(canvas.clientWidth, canvas.clientHeight)
        renderer.shadowMap.enabled = true
        renderer.shadowMap.type = THREE.PCFSoftShadowMap
        renderer.outputColorSpace = THREE.SRGBColorSpace

        // Controls
        controls = new OrbitControls(camera, renderer.domElement)
        controls.enableDamping = true
        controls.dampingFactor = 0.05
        controls.autoRotate = autoRotate
        controls.autoRotateSpeed = rotationSpeed[0]
        controls.minDistance = 1
        controls.maxDistance = 10

        // Lighting setup for realistic rendering
        const ambientLight = new THREE.AmbientLight(0x404040, 0.3)
        scene.add(ambientLight)

        directionalLight = new THREE.DirectionalLight(0xffffff, lightIntensity[0])
        directionalLight.position.set(2, 2, 5)
        directionalLight.castShadow = true
        directionalLight.shadow.mapSize.width = 2048
        directionalLight.shadow.mapSize.height = 2048
        directionalLight.shadow.camera.near = 0.5
        directionalLight.shadow.camera.far = 50
        directionalLight.shadow.camera.left = -10
        directionalLight.shadow.camera.right = 10
        directionalLight.shadow.camera.top = 10
        directionalLight.shadow.camera.bottom = -10
        scene.add(directionalLight)

        // Fill light for softer shadows
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.2)
        fillLight.position.set(-5, 0, 2)
        scene.add(fillLight)

        // Rim light for better definition
        const rimLight = new THREE.DirectionalLight(0xffffff, 0.1)
        rimLight.position.set(0, 5, -5)
        scene.add(rimLight)

        // Grid helper
        gridHelper = new THREE.GridHelper(10, 10, 0x888888, 0xcccccc)
        gridHelper.position.y = 0
        gridHelper.visible = showGrid
        scene.add(gridHelper)

        // Load the 3D head model
        const loader = new GLTFLoader()

        try {
          console.log("Loading head model...")
          const gltf = await new Promise((resolve, reject) => {
            loader.load(
              "/assets/3d/male-head.glb",
              resolve,
              (progress) => {
                const progressPercent = (progress.loaded / progress.total) * 100
                setLoadingProgress(progressPercent)
                console.log("Loading progress:", progressPercent + "%")
              },
              reject,
            )
          })

          console.log("Model loaded successfully:", gltf)

          // Process the loaded model
          headModel = (gltf as any).scene

          // Calculate bounding box to center and scale the model appropriately
          const box = new THREE.Box3().setFromObject(headModel)
          const center = box.getCenter(new THREE.Vector3())
          const size = box.getSize(new THREE.Vector3())

          // Center the model
          headModel.position.set(0, -1, 0)

          // Rotate the model 90 degrees up on Z axis to face forward
          headModel.rotation.y = Math.PI
          headModel.rotation.x = Math.PI / 2
          headModel.rotation.z = Math.PI

          // Scale the model to fit nicely in view
          const maxDim = Math.max(size.x, size.y, size.z)
          const scale = 2.5 / maxDim
          headModel.scale.setScalar(scale)

          // Fine-tune position after rotation
          //  headModel.position.set(0, 0, 0) // Center perfectly
          // headModel.position.y += 0.1 // Slight adjustment if needed

          // Enable shadows and improve materials
          headModel.traverse((child: any) => {
            if (child.isMesh) {
              child.castShadow = true
              child.receiveShadow = true

              // Enhance materials for better rendering
              if (child.material) {
                if (Array.isArray(child.material)) {
                  child.material.forEach((mat: any) => {
                    if (mat.isMeshStandardMaterial || mat.isMeshPhongMaterial) {
                      mat.needsUpdate = true
                    }
                  })
                } else {
                  if (child.material.isMeshStandardMaterial || child.material.isMeshPhongMaterial) {
                    child.material.needsUpdate = true
                  }
                }
              }
            }
          })

          scene.add(headModel)
          console.log("Head model added to scene")
        } catch (modelError) {
          console.error("Failed to load head model:", modelError)
          setLoadingError("Nu s-a putut încărca modelul 3D. Verifică dacă fișierul există.")

          // Fallback to procedural head
          headModel = createFallbackHeadInline(THREE)
          scene.add(headModel)
        }

        // Add facial feature guides
        addFacialGuidesInline(scene, THREE)

        // Store references
        sceneRef.current = {
          scene,
          camera,
          renderer,
          headModel,
          controls,
          gridHelper,
          directionalLight,
          THREE,
        }

        setIsLoading(false)
        setLoadingError(null)

        // Animation loop
        const animate = () => {
          animationId = requestAnimationFrame(animate)
          controls.update()
          renderer.render(scene, camera)
        }
        animate()

        // Handle resize
        const handleResize = () => {
          if (!canvas) return
          camera.aspect = canvas.clientWidth / canvas.clientHeight
          camera.updateProjectionMatrix()
          renderer.setSize(canvas.clientWidth, canvas.clientHeight)
        }
        window.addEventListener("resize", handleResize)

        return () => {
          window.removeEventListener("resize", handleResize)
          if (animationId) {
            cancelAnimationFrame(animationId)
          }
        }
      } catch (error) {
        console.error("Error initializing 3D scene:", error)
        setLoadingError("Nu s-a putut inițializa scena 3D")
        setIsLoading(false)
      }
    }

    initThreeJS()

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId)
      }
    }
  }, [])

  // Update auto rotate
  useEffect(() => {
    if (sceneRef.current?.controls) {
      sceneRef.current.controls.autoRotate = autoRotate
    }
  }, [autoRotate])

  // Update rotation speed
  useEffect(() => {
    if (sceneRef.current?.controls) {
      sceneRef.current.controls.autoRotateSpeed = rotationSpeed[0]
    }
  }, [rotationSpeed])

  // Update light intensity
  useEffect(() => {
    if (sceneRef.current?.directionalLight) {
      sceneRef.current.directionalLight.intensity = lightIntensity[0]
    }
  }, [lightIntensity])

  // Update wireframe
  useEffect(() => {
    if (sceneRef.current?.headModel) {
      sceneRef.current.headModel.traverse((child: any) => {
        if (child.isMesh && child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((mat: any) => {
              mat.wireframe = showWireframe
              mat.needsUpdate = true
            })
          } else {
            child.material.wireframe = showWireframe
            child.material.needsUpdate = true
          }
        }
      })
    }
  }, [showWireframe])

  // Update grid visibility
  useEffect(() => {
    if (sceneRef.current?.gridHelper) {
      sceneRef.current.gridHelper.visible = showGrid
    }
  }, [showGrid])

  const resetCamera = () => {
    if (sceneRef.current?.camera && sceneRef.current?.controls) {
      sceneRef.current.camera.position.set(0, 0, 3)
      sceneRef.current.controls.reset()
    }
  }

  // Drawing canvas functions
  const initializeDrawingCanvas = useCallback(() => {
    const canvas = drawingCanvasRef.current
    if (!canvas) return

    // Get actual rendered dimensions from the canvas element
    const container = canvas.parentElement
    if (!container) return

    // Set canvas internal resolution to match its display size
    canvas.width = container.clientWidth
    canvas.height = container.clientHeight

    const context = canvas.getContext("2d")
    if (!context) return

    context.lineCap = "round"
    context.lineJoin = "round"
    context.imageSmoothingEnabled = true
    context.strokeStyle = brushColor
    context.lineWidth = brushSize[0]
    context.fillStyle = "white"
    context.fillRect(0, 0, canvas.width, canvas.height)

    drawingContextRef.current = context
    setCanvasReady(true)
  }, [brushColor, brushSize])

  const getPointerInfo = (e: React.PointerEvent<HTMLCanvasElement> | React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = drawingCanvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const point = getPointerInfo(e)
    setIsDrawing(true)
    setCurrentPath([point])
  }

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    const point = getPointerInfo(e)
    setCurrentPath((prev) => [...prev, point])
  }

  const stopDrawing = () => {
    if (!isDrawing) return
    setIsDrawing(false)

    if (currentPath.length > 0) {
      const newPath = {
        points: [...currentPath],
        color: brushColor,
        size: brushSize[0],
        tool: drawingTool,
      }
      setPaths((prev) => [...prev, newPath])
      setCurrentPath([])
    }
  }

  const clearDrawingCanvas = () => {
    setPaths([])
    setCurrentPath([])
    const canvas = drawingCanvasRef.current
    const context = drawingContextRef.current
    if (canvas && context) {
      context.fillStyle = "white"
      context.fillRect(0, 0, canvas.width, canvas.height)
    }
  }

  const undoDrawing = () => {
    setPaths((prev) => prev.slice(0, -1))
  }

  const downloadDrawing = () => {
    const canvas = drawingCanvasRef.current
    if (!canvas) return

    const tempCanvas = document.createElement("canvas")
    const tempContext = tempCanvas.getContext("2d")
    if (!tempContext) return

    tempCanvas.width = canvas.width
    tempCanvas.height = canvas.height
    tempContext.fillStyle = "white"
    tempContext.fillRect(0, 0, tempCanvas.width, tempCanvas.height)
    tempContext.drawImage(canvas, 0, 0)

    const dataURL = tempCanvas.toDataURL("image/png", 1.0)
    const link = document.createElement("a")
    link.download = `model-3d-sketch-${new Date().toISOString().slice(0, 10)}.png`
    link.href = dataURL
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast({
      title: "Descărcare reușită",
      description: "Schița a fost descărcată cu succes.",
      variant: "success",
    })
  }

  // Initialize drawing canvas when split view is enabled
  useEffect(() => {
    if (splitViewMode) {
      setTimeout(() => {
        initializeDrawingCanvas()
      }, 100)
    }
  }, [splitViewMode, initializeDrawingCanvas])

  // Redraw drawing canvas when paths change
  useEffect(() => {
    if (!canvasReady || !splitViewMode) return

    const canvas = drawingCanvasRef.current
    const context = drawingContextRef.current
    if (!canvas || !context) return

    context.fillStyle = "white"
    context.fillRect(0, 0, canvas.width, canvas.height)

    paths.forEach((path) => {
      if (path.points.length > 0) {
        context.strokeStyle = path.tool === "eraser" ? "white" : path.color
        context.globalCompositeOperation = path.tool === "eraser" ? "destination-out" : "source-over"
        context.lineWidth = path.size
        context.beginPath()
        context.moveTo(path.points[0].x, path.points[0].y)
        for (let i = 1; i < path.points.length; i++) {
          context.lineTo(path.points[i].x, path.points[i].y)
        }
        context.stroke()
      }
    })

    if (isDrawing && currentPath.length > 0) {
      context.strokeStyle = drawingTool === "eraser" ? "white" : brushColor
      context.globalCompositeOperation = drawingTool === "eraser" ? "destination-out" : "source-over"
      context.lineWidth = brushSize[0]
      context.beginPath()
      context.moveTo(currentPath[0].x, currentPath[0].y)
      for (let i = 1; i < currentPath.length; i++) {
        context.lineTo(currentPath[i].x, currentPath[i].y)
      }
      context.stroke()
    }
  }, [paths, currentPath, canvasReady, splitViewMode, isDrawing, brushColor, brushSize, drawingTool])

  // Force resize and re-render when entering/exiting split view
  useEffect(() => {
    if (!sceneRef.current) return

    const reinitializeThreeJSForSplitView = async () => {
      if (!splitViewMode) return

      const canvas = canvasRef.current
      if (!canvas) {
        return
      }

      try {
        // Import Three.js again
        const THREE = await import("three")
        const { OrbitControls } = await import("three/addons/controls/OrbitControls.js")
        const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js")

        // Get actual rendered dimensions of the canvas element
        const width = canvas.clientWidth
        const height = canvas.clientHeight

        // Clear the old renderer
        if (sceneRef.current?.renderer) {
          sceneRef.current.renderer.dispose()
        }

        // Create new scene
        const scene = new THREE.Scene()
        scene.background = new THREE.Color(0xf5f5f5)

        // Create new camera
        const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000)
        camera.position.set(0, 3, 3)

        // Set canvas size first
        canvas.width = width
        canvas.height = height
        canvas.style.width = width + "px" // Ensure CSS respects these
        canvas.style.height = height + "px" // Ensure CSS respects these

        // Create new renderer
        const renderer = new THREE.WebGLRenderer({
          canvas,
          antialias: true,
          preserveDrawingBuffer: true,
          alpha: false,
        })
        renderer.setSize(width, height, false)
        renderer.shadowMap.enabled = true
        renderer.shadowMap.type = THREE.PCFSoftShadowMap
        renderer.outputColorSpace = THREE.SRGBColorSpace
        renderer.setClearColor(0xf5f5f5, 1)

        // Create new controls
        const controls = new OrbitControls(camera, renderer.domElement)
        controls.enableDamping = true
        controls.dampingFactor = 0.05
        controls.autoRotate = autoRotate
        controls.autoRotateSpeed = rotationSpeed[0]
        controls.minDistance = 1
        controls.maxDistance = 10

        // Add lighting
        const ambientLight = new THREE.AmbientLight(0x404040, 0.3)
        scene.add(ambientLight)

        const directionalLight = new THREE.DirectionalLight(0xffffff, lightIntensity[0])
        directionalLight.position.set(2, 2, 5)
        directionalLight.castShadow = true
        scene.add(directionalLight)

        const fillLight = new THREE.DirectionalLight(0xffffff, 0.2)
        fillLight.position.set(-5, 0, 2)
        scene.add(fillLight)

        const rimLight = new THREE.DirectionalLight(0xffffff, 0.1)
        rimLight.position.set(0, 5, -5)
        scene.add(rimLight)

        // Add grid
        const gridHelper = new THREE.GridHelper(10, 10, 0x888888, 0xcccccc)
        gridHelper.position.y = 0
        gridHelper.visible = showGrid
        scene.add(gridHelper)

        // Add head model (try to reuse existing or create fallback)
        let headModel
        if (sceneRef.current?.headModel) {
          // Clone the existing model
          headModel = sceneRef.current.headModel.clone()
        } else {
          // Create fallback model
          headModel = createFallbackHeadInline(THREE)
        }

        scene.add(headModel)

        // Add facial guides
        addFacialGuidesInline(scene, THREE)

        // Update scene reference
        sceneRef.current = {
          scene,
          camera,
          renderer,
          headModel,
          controls,
          gridHelper,
          directionalLight,
          THREE,
        }


        // Start new animation loop
        let animationId: number
        const animate = () => {
          animationId = requestAnimationFrame(animate)
          controls.update()
          renderer.render(scene, camera)
        }
        animate()

        // Force immediate renders
        for (let i = 0; i < 5; i++) {
          setTimeout(() => {
            renderer.render(scene, camera)
          }, i * 100)
        }

      } catch (error) {
      }
    }

    const reinitializeThreeJSForNormalView = async () => {
      if (splitViewMode) return


      const canvas = canvasRef.current
      if (!canvas) {
        return
      }

      try {
        // Import Three.js again
        const THREE = await import("three")
        const { OrbitControls } = await import("three/addons/controls/OrbitControls.js")
        const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js")

        // Get actual rendered dimensions of the canvas element
        const width = canvas.clientWidth
        const height = canvas.clientHeight // This will be 600px due to CSS


        // Clear the old renderer
        if (sceneRef.current?.renderer) {
          sceneRef.current.renderer.dispose()
        }

        // Create new scene
        const scene = new THREE.Scene()
        scene.background = new THREE.Color(0xf5f5f5)

        // Create new camera
        const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000)
        camera.position.set(0, 3, 3)

        // Set canvas size first
        canvas.width = width
        canvas.height = height
        canvas.style.width = width + "px"
        canvas.style.height = height + "px"

        // Create new renderer
        const renderer = new THREE.WebGLRenderer({
          canvas,
          antialias: true,
          preserveDrawingBuffer: true,
          alpha: false,
        })
        renderer.setSize(width, height, false)
        renderer.shadowMap.enabled = true
        renderer.shadowMap.type = THREE.PCFSoftShadowMap
        renderer.outputColorSpace = THREE.SRGBColorSpace
        renderer.setClearColor(0xf5f5f5, 1)


        // Create new controls
        const controls = new OrbitControls(camera, renderer.domElement)
        controls.enableDamping = true
        controls.dampingFactor = 0.05
        controls.autoRotate = autoRotate
        controls.autoRotateSpeed = rotationSpeed[0]
        controls.minDistance = 1
        controls.maxDistance = 10

        // Add lighting
        const ambientLight = new THREE.AmbientLight(0x404040, 0.3)
        scene.add(ambientLight)

        const directionalLight = new THREE.DirectionalLight(0xffffff, lightIntensity[0])
        directionalLight.position.set(2, 2, 5)
        directionalLight.castShadow = true
        scene.add(directionalLight)

        const fillLight = new THREE.DirectionalLight(0xffffff, 0.2)
        fillLight.position.set(-5, 0, 2)
        scene.add(fillLight)

        const rimLight = new THREE.DirectionalLight(0xffffff, 0.1)
        rimLight.position.set(0, 5, -5)
        scene.add(rimLight)

        // Add grid
        const gridHelper = new THREE.GridHelper(10, 10, 0x888888, 0xcccccc)
        gridHelper.position.y = 0
        gridHelper.visible = showGrid
        scene.add(gridHelper)

        // Add head model (try to reuse existing or create fallback)
        let headModel
        if (sceneRef.current?.headModel) {
          // Clone the existing model
          headModel = sceneRef.current.headModel.clone()
        } else {
          // Create fallback model
          headModel = createFallbackHeadInline(THREE)
        }

        scene.add(headModel)

        // Add facial guides
        addFacialGuidesInline(scene, THREE)

        // Update scene reference
        sceneRef.current = {
          scene,
          camera,
          renderer,
          headModel,
          controls,
          gridHelper,
          directionalLight,
          THREE,
        }

        // Start new animation loop
        let animationId: number
        const animate = () => {
          animationId = requestAnimationFrame(animate)
          controls.update()
          renderer.render(scene, camera)
        }
        animate()

        // Force immediate renders
        for (let i = 0; i < 5; i++) {
          setTimeout(() => {
            renderer.render(scene, camera)
            if (i === 0) console.log("First immediate render completed for normal view")
          }, i * 100)
        }

      } catch (error) {
        console.error("Error reinitializing Three.js for normal view:", error)
      }
    }

    // Reinitialize when entering split view
    if (splitViewMode) {
      setTimeout(() => {
        reinitializeThreeJSForSplitView()
      }, 500) // Give DOM time to update
    } else {
      // Reinitialize when exiting split view (returning to normal view)
      setTimeout(() => {
        reinitializeThreeJSForNormalView()
      }, 500) // Give DOM time to update
    }
  }, [splitViewMode, autoRotate, rotationSpeed, lightIntensity, showGrid])

  // Also add a simpler resize handler for normal view
  useEffect(() => {
    if (splitViewMode || !sceneRef.current?.renderer || !sceneRef.current?.camera) return

    const handleNormalResize = () => {
      const canvas = canvasRef.current
      if (!canvas) return

      const { renderer, camera } = sceneRef.current
      const rect = canvas.getBoundingClientRect()

      camera.aspect = rect.width / rect.height
      camera.updateProjectionMatrix()
      renderer.setSize(rect.width, rect.height)
    }

    window.addEventListener("resize", handleNormalResize)
    return () => window.removeEventListener("resize", handleNormalResize)
  }, [splitViewMode])

  // Debug and force render when split view changes
  useEffect(() => {
    if (!sceneRef.current) return


    // Force continuous rendering for a few seconds when entering split view
    if (splitViewMode) {

      const forceRenderInterval = setInterval(() => {
        if (sceneRef.current?.renderer && sceneRef.current?.scene && sceneRef.current?.camera) {
          try {
            sceneRef.current.renderer.render(sceneRef.current.scene, sceneRef.current.camera)
          } catch (error) {
            console.error("Forced render error:", error)
          }
        }
      }, 100)

      // Also try to reset the canvas context
      setTimeout(() => {
        const canvas = canvasRef.current
        if (canvas && sceneRef.current?.renderer) {
          console.log("Attempting canvas context reset")
          const { renderer, scene, camera } = sceneRef.current

          // Get current canvas dimensions
          const rect = canvas.getBoundingClientRect()
          console.log("Canvas rect:", rect.width, "x", rect.height)

          // Force renderer to use the canvas again
          renderer.setSize(rect.width, rect.height, true)
          renderer.render(scene, camera)

          console.log("Canvas context reset attempted")
        }
      }, 500)

      // Stop forced rendering after 5 seconds
      setTimeout(() => {
        clearInterval(forceRenderInterval)
        console.log("🛑 Stopped forced rendering")
      }, 5000)

      return () => clearInterval(forceRenderInterval)
    }
  }, [splitViewMode])

  // Fallback function pentru modelul procedural simplu
  function createFallbackHeadInline(THREE: any) {
    const headGroup = new THREE.Group()

    const skinMaterial = new THREE.MeshPhongMaterial({
      color: 0xfdbcb4,
      shininess: 30,
    })

    const headGeometry = new THREE.SphereGeometry(1, 32, 32)
    headGeometry.scale(0.85, 1.1, 0.95)

    const head = new THREE.Mesh(headGeometry, skinMaterial)
    head.castShadow = true
    head.receiveShadow = true
    headGroup.add(head)

    return headGroup
  }

  // Helper function to add facial feature guides
  function addFacialGuidesInline(scene: any, THREE: any) {
    const horizontalLines = [
      { y: 1, color: 0xff0000, name: "hairline" },
      { y: 0.8, color: 0x0000ff, name: "eyebrow" },
      { y: 0.6, color: 0x00ff00, name: "eye" },
      { y: 0, color: 0xffff00, name: "nose" },
      { y: -0.3, color: 0xff00ff, name: "mouth" },
      { y: -0.7, color: 0x00ffff, name: "chin" },
    ]

    horizontalLines.forEach((line) => {
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-1.5, line.y, 0),
        new THREE.Vector3(1.5, line.y, 0),
      ])
      const material = new THREE.LineBasicMaterial({ color: line.color, opacity: 0.5, transparent: true })
      const guideLine = new THREE.Line(geometry, material)
      scene.add(guideLine)
    })

    const centerGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, -1.5, 0),
      new THREE.Vector3(0, 2, 0),
    ])
    const centerLine = new THREE.Line(
      centerGeometry,
      new THREE.LineBasicMaterial({ color: 0x888888, opacity: 0.3, transparent: true }),
    )
    scene.add(centerLine)
  }

  // Force resize when entering split view
  useEffect(() => {
    if (splitViewMode && sceneRef.current?.renderer && sceneRef.current?.camera) {
      const canvas = canvasRef.current
      if (!canvas) return

      setTimeout(() => {
        const { renderer, camera } = sceneRef.current
        const rect = canvas.getBoundingClientRect()

        camera.aspect = rect.width / rect.height
        camera.updateProjectionMatrix()
        renderer.setSize(rect.width, rect.height)
      }, 200)
    }
  }, [splitViewMode])

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        <Navigation />

        <div className="container mx-auto px-4 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-foreground bauhaus-heading mb-4">
                  Model 3D - Cap uman {splitViewMode && "& Desen"}
                </h1>
                <p className="text-xl text-muted-foreground max-w-2xl">
                  {splitViewMode
                    ? "Desenează în timp real folosind modelul 3D ca referință directă."
                    : "Explorează proporțiile și structura capului uman dintr-o perspectivă tridimensională pentru a înțelege mai bine anatomia facială."}
                </p>
              </div>
              <Button
                onClick={() => setSplitViewMode(!splitViewMode)}
                variant={splitViewMode ? "default" : "outline"}
                size="lg"
                className="flex items-center space-x-2"
              >
                <SplitSquareHorizontal className="h-5 w-5" />
                <span>{splitViewMode ? "Ieși din modul desen" : "Mod desen"}</span>
              </Button>
            </div>
          </div>

          {splitViewMode ? (
            // Split View Layout
            <div className="grid lg:grid-cols-2 gap-6 h-[calc(100vh-200px)]">
              {/* Left Side - 3D Model */}
              <div className="space-y-4">
                <Card className="h-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Model 3D</CardTitle>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant={autoRotate ? "default" : "outline"}
                        size="sm"
                        onClick={() => setAutoRotate(!autoRotate)}
                      >
                        {autoRotate ? "Stop rotație" : "Auto rotație"}
                      </Button>
                      <Button variant="outline" size="sm" onClick={resetCamera}>
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Reset
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 h-full">
                    <div className="relative h-[calc(100vh-304px)]">
                      {" "}
                      {/* Adjusted height */}
                      {isLoading && (
                        <div className="absolute inset-0 bg-gray-100 rounded-lg flex items-center justify-center z-10">
                          <div className="text-center">
                            <div className="animate-spin rounded-lg h-8 w-8 border-b-2 border-accent mx-auto mb-2"></div>
                            <p className="text-sm text-muted-foreground">Se încarcă modelul 3D...</p>
                          </div>
                        </div>
                      )}
                      <canvas
                        ref={canvasRef}
                        className="w-full h-full rounded-lg border-2 border-border bg-gray-50" // Removed inline style
                        style={{ display: "block" }}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Side - Drawing Canvas */}
              <div className="space-y-4">
                <Card className="h-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Canvas de desen</CardTitle>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant={drawingTool === "pencil" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setDrawingTool("pencil")}
                      >
                        <Brush className="h-4 w-4 mr-1" />
                        Pensulă
                      </Button>
                      <Button
                        variant={drawingTool === "eraser" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setDrawingTool("eraser")}
                      >
                        <Eraser className="h-4 w-4 mr-1" />
                        Gumă
                      </Button>
                      <div className="flex items-center space-x-1">
                        <span className="text-xs">Mărime:</span>
                        <input
                          type="range"
                          min="1"
                          max="20"
                          value={brushSize[0]}
                          onChange={(e) => setBrushSize([Number.parseInt(e.target.value)])}
                          className="w-16"
                        />
                        <span className="text-xs w-6">{brushSize[0]}</span>
                      </div>
                      {drawingTool === "pencil" && (
                        <input
                          type="color"
                          value={brushColor}
                          onChange={(e) => setBrushColor(e.target.value)}
                          className="w-8 h-8 rounded border"
                        />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 h-full">
                    <div className="relative h-[calc(100vh-304px)]">
                      {" "}
                      {/* Adjusted height */}
                      <canvas
                        ref={drawingCanvasRef}
                        className="border-2 border-gray-300 rounded-lg bg-white cursor-crosshair touch-none w-full h-full"
                        onPointerDown={startDrawing}
                        onPointerMove={draw}
                        onPointerUp={stopDrawing}
                        onPointerLeave={stopDrawing}
                      />
                      <div className="absolute bottom-2 right-2 flex space-x-1">
                        <Button variant="outline" size="sm" onClick={undoDrawing}>
                          <Undo className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={clearDrawingCanvas}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={downloadDrawing}>
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            // Normal View Layout (codul existent)
            <div className="grid lg:grid-cols-4 gap-6">
              {/* Controls Panel */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Move3D className="h-5 w-5" />
                    <span>Controale</span>
                  </CardTitle>
                  <CardDescription>Personalizează vizualizarea modelului 3D</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Loading Progress */}
                  {isLoading && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        <span className="text-sm font-medium text-blue-900 dark:text-blue-100">Se încarcă...</span>
                      </div>
                      <div className="w-full bg-blue-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${loadingProgress}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-blue-700 dark:text-blue-200 mt-1">
                        {Math.round(loadingProgress)}% completat
                      </p>
                    </div>
                  )}

                  {/* Auto Rotate */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium">Rotație automată</label>
                      <Button
                        variant={autoRotate ? "default" : "outline"}
                        size="sm"
                        onClick={() => setAutoRotate(!autoRotate)}
                      >
                        {autoRotate ? "Activă" : "Inactivă"}
                      </Button>
                    </div>
                  </div>

                  {/* Rotation Speed */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Viteză rotație: {rotationSpeed[0]}x</label>
                    <Slider
                      value={rotationSpeed}
                      onValueChange={setRotationSpeed}
                      max={5}
                      min={0.1}
                      step={0.1}
                      disabled={!autoRotate}
                    />
                  </div>

                  {/* Light Intensity */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Intensitate lumină: {lightIntensity[0]}</label>
                    <Slider value={lightIntensity} onValueChange={setLightIntensity} max={2} min={0.1} step={0.1} />
                  </div>

                  {/* View Options */}
                  <div className="space-y-2">
                    <Button
                      variant={showWireframe ? "default" : "outline"}
                      size="sm"
                      onClick={() => setShowWireframe(!showWireframe)}
                      className="w-full"
                    >
                      <Grid3X3 className="h-4 w-4 mr-2" />
                      Wireframe
                    </Button>

                    <Button
                      variant={showGrid ? "default" : "outline"}
                      size="sm"
                      onClick={() => setShowGrid(!showGrid)}
                      className="w-full"
                    >
                      <Grid3X3 className="h-4 w-4 mr-2" />
                      Grilă
                    </Button>

                    <Button variant="outline" size="sm" onClick={resetCamera} className="w-full bg-transparent">
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reset cameră
                    </Button>
                  </div>

                  {/* Instructions */}
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>
                      <strong>Click + drag:</strong> Rotește modelul
                    </p>
                    <p>
                      <strong>Scroll:</strong> Zoom in/out
                    </p>
                    <p>
                      <strong>Right click + drag:</strong> Mișcă camera
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* 3D Viewer */}
              <div className="lg:col-span-2">
                <Card>
                  <CardContent className="p-4">
                    <div className="relative">
                      {isLoading && (
                        <div className="absolute inset-0 bg-gray-100 rounded-lg flex items-center justify-center z-10">
                          <div className="text-center">
                            <div className="animate-spin rounded-lg h-8 w-8 border-b-2 border-accent mx-auto mb-2"></div>
                            <p className="text-sm text-muted-foreground">Se încarcă modelul 3D...</p>
                            <p className="text-xs text-muted-foreground mt-1">{Math.round(loadingProgress)}%</p>
                          </div>
                        </div>
                      )}
                      {loadingError && (
                        <div className="absolute inset-0 bg-red-50 rounded-lg flex items-center justify-center z-10">
                          <div className="text-center max-w-sm">
                            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                            <p className="text-sm text-red-600 mb-2">{loadingError}</p>
                            <p className="text-xs text-red-500">Se folosește modelul de rezervă</p>
                          </div>
                        </div>
                      )}
                      <canvas
                        ref={canvasRef}
                        className="w-full h-[600px] rounded-lg border-2 border-border bg-gray-50"
                        style={{ display: "block" }}
                      />
                      <div className="absolute top-2 right-2 flex space-x-2">
                        <Badge variant="secondary">
                          <Eye className="h-3 w-3 mr-1" />
                          Cap Masculin
                        </Badge>
                        {!loadingError && <Badge variant="default">GLTF</Badge>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Information Panel */}
              <div className="lg:col-span-1 space-y-6">
                {/* Proportions Guide */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Ghid proporții</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Înălțime cap:</span>
                        <span className="font-medium">8 unități</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Lățime cap:</span>
                        <span className="font-medium">6 unități</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Poziție ochi:</span>
                        <span className="font-medium">Mijlocul capului</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Distanță între ochi:</span>
                        <span className="font-medium">1 ochi</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Nas (lungime):</span>
                        <span className="font-medium">1/3 față inferioară</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Tips */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Lightbulb className="h-5 w-5" />
                      <span>Sfaturi</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 text-sm">
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <p className="font-medium text-blue-900 dark:text-blue-100">💡 Observă</p>
                        <p className="text-blue-700 dark:text-blue-200">
                          Rotește modelul pentru a vedea cum se schimbă proporțiile din diferite unghiuri.
                        </p>
                      </div>
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <p className="font-medium text-green-900 dark:text-green-100">✅ Practică</p>
                        <p className="text-green-700 dark:text-green-200">
                          Folosește acest model ca referință când desenezi portrete.
                        </p>
                      </div>
                      <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                        <p className="font-medium text-yellow-900 dark:text-yellow-100">⚠️ Atenție</p>
                        <p className="text-yellow-700 dark:text-yellow-200">
                          Fiecare persoană are proporții ușor diferite - aceasta este o bază generală.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Anatomical Points */}
                <Card>
                  <CardHeader>
                    <CardTitle>Puncte anatomice</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span>Linia părului</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span>Linia sprâncenelor</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span>Baza nasului</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                        <span>Linia bărbiei</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  )
}
