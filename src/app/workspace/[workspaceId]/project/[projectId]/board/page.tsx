'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Kanban, List, BarChart3 } from 'lucide-react'
import { getUserWorkspaces } from '@/lib/api/users'
import { getProjects } from '@/lib/api/projects'

interface Workspace {
  id: string
  name: string
}

interface Project {
  id: string
  name: string
  color: string
}

export default function ProjectBoardPage() {
  const { data: session, status } = useSession()
  const params = useParams()
  const router = useRouter()
  
  const workspaceId = params.workspaceId as string
  const projectId = params.projectId as string

  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id) {
      loadData()
    }
  }, [status, session, workspaceId, projectId])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      const userWorkspaces = await getUserWorkspaces(session!.user.id)
      const currentWorkspace = userWorkspaces.find(w => w.id === workspaceId)
      
      if (!currentWorkspace) {
        setError('Workspace not found')
        return
      }
      
      setWorkspace(currentWorkspace)

      const projectsResult = await getProjects(workspaceId)
      const currentProject = projectsResult.projects?.find(p => p.id === projectId)
      
      if (!currentProject) {
        setError('Project not found')
        return
      }
      
      setProject(currentProject)

    } catch (error) {
      console.error('Error loading data:', error)
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  // Redirect to old board view with project parameter
  useEffect(() => {
    if (project && !loading && !error) {
      router.push(`/board?project=${projectId}`)
    }
  }, [project, projectId, loading, error, router])

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading board...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600 mb-8">{error}</p>
          <Link
            href={`/workspace/${workspaceId}`}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors"
          >
            Back to Workspace
          </Link>
        </div>
      </div>
    )
  }

  return null
}