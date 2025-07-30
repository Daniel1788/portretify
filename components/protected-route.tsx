"use client"

import type React from "react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth"
import type { JSX } from "react/jsx-runtime"

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAuth?: boolean
  adminOnly?: boolean
}

export function ProtectedRoute({
  children,
  requireAuth = true,
  adminOnly = false,
}: ProtectedRouteProps): JSX.Element | null {
  const { user, isAdmin, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (requireAuth && !user) {
        router.push("/")
        return
      }

      if (adminOnly && !isAdmin) {
        router.push("/unauthorized")
        return
      }
    }
  }, [user, isAdmin, loading, requireAuth, adminOnly, router])

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Se verifică autentificarea...</p>
        </div>
      </div>
    )
  }

  // Don't render if auth requirements not met
  if (requireAuth && !user) {
    return null
  }

  if (adminOnly && !isAdmin) {
    return null
  }

  return <>{children}</>
}
