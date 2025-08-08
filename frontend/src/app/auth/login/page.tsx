'use client'

import { Suspense } from 'react'
import { LoginForm } from '@/components/auth/login-form'
import { GuestOnlyRoute } from '@/components/auth/auth-guard'
import { LoadingSpinner } from '@/components/ui/spinner'

export default function LoginPage() {
  return (
    <GuestOnlyRoute>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Compliance RAG System
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Intelligent document analysis and compliance assistance
            </p>
          </div>
          
          <Suspense fallback={<LoadingSpinner text="Loading login form..." />}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </GuestOnlyRoute>
  )
}