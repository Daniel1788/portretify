"use client"

import { useRef, useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { RotateCcw, Move3D, Eye, Grid3X3, Lightbulb, AlertCircle } from "lucide-react"
import { AuthGuard } from "@/components/auth-guard"
import { Navigation } from "@/components/navigation"

export default function Model3DPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadingError, setLoadingError] = useState<string | null>(null)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [rotationSpeed, setRotationSpeed] = useState([1])
  const [autoRotate, setAutoRotate] = useState(true)
  const [showWireframe, setShowWireframe] = useState(false)
  const [showGrid, setShowGrid] = useState(true)
  const [lightIntensity, setLightIntensity] = useState([1])

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

          headModel.traverse((child: any) => {
            if (child.isMesh) {
              child.castShadow = true
              child.receiveShadow = true

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
        } catch (modelError) {
          console.error("Failed to load head model:", modelError)
          setLoadingError("Nu s-a putut încărca modelul 3D. Verifică dacă fișierul există.")

          // Fallback to procedural head
          headModel = createFallbackHead(THREE)
          scene.add(headModel)
        }

        // Add facial feature guides
        addFacialGuides(scene, THREE)

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

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        <Navigation />

        <div className="container mx-auto px-4 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground bauhaus-heading mb-4">Model 3D - Cap uman</h1>
            <p className="text-xl text-muted-foreground max-w-2xl">
              Explorează proporțiile și structura capului uman dintr-o perspectivă tridimensională pentru a înțelege mai
              bine anatomia facială.
            </p>
          </div>

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
        </div>
      </div>
    </AuthGuard>
  )
}

// Fallback function pentru modelul procedural simplu
function createFallbackHead(THREE: any) {
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
function addFacialGuides(scene: any, THREE: any) {
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
