'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { LoadingSpinner } from '@/components/ui/spinner'
import { useAuth, useAuthChecker } from '@/hooks/use-auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface AuthGuardProps {
  children: React.ReactNode
  requireAuth?: boolean
  fallback?: React.ReactNode
  redirectTo?: string
  loadingComponent?: React.ReactNode
}

export function AuthGuard({ 
  children, 
  requireAuth = true,
  fallback,
  redirectTo = '/auth/login',
  loadingComponent,
}: AuthGuardProps) {
  const [mounted, setMounted] = React.useState(false)
  const { isAuthenticated, isLoading, user } = useAuth()
  const router = useRouter()

  // Check auth status on mount
  useAuthChecker()

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Don't render anything until mounted (prevents hydration mismatch)
  if (!mounted) {
    return loadingComponent || <LoadingSpinner text="Loading..." />
  }

  // If auth is not required, just render children
  if (!requireAuth) {
    return <>{children}</>
  }

  // Show loading while checking authentication
  if (isLoading) {
    return loadingComponent || <LoadingSpinner text="Checking authentication..." />
  }

  // User is not authenticated
  if (!isAuthenticated) {
    if (fallback) {
      return <>{fallback}</>
    }

    // Redirect to login
    router.push(redirectTo)
    return <LoadingSpinner text="Redirecting..." />
  }

  // User is authenticated, render children
  return <>{children}</>
}

// Component for protecting routes that require authentication
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard
      requireAuth={true}
      fallback={
        <div className="flex items-center justify-center min-h-screen p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle>Authentication Required</CardTitle>
              <CardDescription>
                You need to be logged in to access this page
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button asChild className="w-full">
                <Link href="/auth/login">Sign In</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="/auth/register">Create Account</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      }
    >
      {children}
    </AuthGuard>
  )
}

// Component for protecting routes that require user to be logged out
export function GuestOnlyRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  React.useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading) {
    return <LoadingSpinner text="Loading..." />
  }

  if (isAuthenticated) {
    return <LoadingSpinner text="Redirecting..." />
  }

  return <>{children}</>
}

// Higher-order component for wrapping pages that require authentication
export function withAuth<T extends {}>(
  WrappedComponent: React.ComponentType<T>,
  options: {
    requireAuth?: boolean
    redirectTo?: string
    loadingComponent?: React.ReactNode
  } = {}
) {
  const { requireAuth = true, redirectTo = '/auth/login', loadingComponent } = options

  return function AuthenticatedComponent(props: T) {
    return (
      <AuthGuard 
        requireAuth={requireAuth}
        redirectTo={redirectTo}
        loadingComponent={loadingComponent}
      >
        <WrappedComponent {...props} />
      </AuthGuard>
    )
  }
}

// Hook to check if user has specific permissions (extend as needed)
export function usePermissions() {
  const { user } = useAuth()

  const hasPermission = React.useCallback((permission: string) => {
    // Implement your permission logic here
    // This is a basic example
    if (!user) return false
    
    // For now, all authenticated users have all permissions
    // You can extend this based on your user roles/permissions system
    return user.is_active
  }, [user])

  const isAdmin = React.useCallback(() => {
    // Implement admin check logic
    // This would typically check user roles
    return user?.is_active && user?.email.includes('admin')
  }, [user])

  return {
    hasPermission,
    isAdmin,
    user,
  }
}

// Component for conditional rendering based on permissions
interface PermissionGateProps {
  children: React.ReactNode
  permission?: string
  adminOnly?: boolean
  fallback?: React.ReactNode
}

export function PermissionGate({ 
  children, 
  permission, 
  adminOnly = false,
  fallback = null 
}: PermissionGateProps) {
  const { hasPermission, isAdmin } = usePermissions()

  if (adminOnly && !isAdmin()) {
    return <>{fallback}</>
  }

  if (permission && !hasPermission(permission)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}