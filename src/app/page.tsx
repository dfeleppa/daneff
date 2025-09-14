'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'authenticated') {
      // Redirect authenticated users to dashboard
      router.replace('/dashboard')
    }
  }, [status, router])

  // Show loading state while redirecting
  if (status === 'loading' || status === 'authenticated') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Show landing page for unauthenticated users
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-6 py-12">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to TaskFlow
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Manage your projects and tasks with ease
          </p>
          <div className="space-y-4">
            <p className="text-gray-600">Please sign in to continue</p>
          </div>
        </div>
      </div>
    </div>
  )
}