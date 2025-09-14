'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Building2, Users, Calendar, ArrowRight, Plus } from 'lucide-react'
import { getUserWorkspaces } from '@/lib/api/users'
import AppLayout from '@/components/AppLayout'

interface Workspace {
  id: string
  name: string
  slug: string
  description: string | null
  owner_id: string
  created_at: string
  user_role: string
}

export default function HomePage() {
  const { data: session, status } = useSession()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id) {
      loadWorkspaces()
    }
  }, [status, session])

  const loadWorkspaces = async () => {
    try {
      setLoading(true)
      setError(null)
      const userWorkspaces = await getUserWorkspaces(session!.user.id)
      setWorkspaces(userWorkspaces)
    } catch (error) {
      console.error('Error loading workspaces:', error)
      setError('Failed to load workspaces')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading workspaces...</p>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Welcome to TaskFlow</h1>
          <p className="text-gray-600 mb-8">Please sign in to access your workspaces</p>
        </div>
      </div>
    )
  }

  return (
    <AppLayout>
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-800 mb-4">
              Choose Your Workspace
            </h2>
            <p className="text-xl text-gray-600">
              Select a workspace to manage your projects and tasks
            </p>
          </div>

          {error && (
            <div className="mb-8 bg-red-50 border border-red-200 rounded-lg p-4 max-w-md mx-auto">
              <p className="text-red-800 text-center">{error}</p>
            </div>
          )}

          {workspaces.length === 0 ? (
            <div className="text-center py-16">
              <Building2 className="w-24 h-24 text-gray-400 mx-auto mb-6" />
              <h3 className="text-2xl font-semibold text-gray-700 mb-4">No Workspaces Found</h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                You don't have access to any workspaces yet. Create your first workspace or ask to be invited to an existing one.
              </p>
              <button className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-3 rounded-xl hover:from-blue-700 hover:to-indigo-700 font-medium flex items-center mx-auto transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
                <Plus className="w-5 h-5 mr-2" />
                Create Workspace
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {workspaces.map((workspace) => (
                <Link
                  key={workspace.id}
                  href={`/workspace/${workspace.id}`}
                  className="group bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-6 hover:shadow-lg transition-all duration-200 hover:scale-105 hover:bg-white/90"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-white" />
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                  </div>
                  
                  <h3 className="text-xl font-semibold text-gray-800 mb-2 group-hover:text-blue-600 transition-colors">
                    {workspace.name}
                  </h3>
                  
                  {workspace.description && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {workspace.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center">
                        <Users className="w-4 h-4 mr-1" />
                        <span className="capitalize">{workspace.user_role}</span>
                      </div>
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        <span>{new Date(workspace.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {workspaces.length > 0 && (
            <div className="mt-16 text-center">
              <h3 className="text-lg font-semibold text-gray-700 mb-6">Quick Actions</h3>
              <div className="flex justify-center space-x-4">
                <button className="px-6 py-3 bg-white/80 border border-gray-200 rounded-xl hover:bg-white hover:shadow-md transition-all duration-200 flex items-center text-gray-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Workspace
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}