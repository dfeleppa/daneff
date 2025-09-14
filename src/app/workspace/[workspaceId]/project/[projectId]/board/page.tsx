'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Kanban, List, BarChart3, Plus } from 'lucide-react'
import { getUserWorkspaces } from '@/lib/api/users'
import { getProjects, getProjectTasks, getTaskStatuses } from '@/lib/api/projects'

interface Workspace {
  id: string
  name: string
}

interface Project {
  id: string
  name: string
  color: string
}

interface Task {
  id: string
  title: string
  description: string | null
  status_id: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  due_date: string | null
  created_at: string
  status?: {
    id: string
    name: string
    color: string
    order_index: number
  }
}

interface TaskStatus {
  id: string
  name: string
  color: string
  order_index: number
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link
            href={`/workspace/${workspaceId}/project/${projectId}`}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Project
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Kanban className="h-8 w-8 text-blue-600" />
                {project?.name} Board
              </h1>
              <p className="text-gray-600 mt-2">Kanban board view for {project?.name}</p>
            </div>
          </div>

          <div className="text-center py-16">
            <Kanban className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Board View</h3>
            <p className="text-gray-600 mb-6">
              Board functionality coming soon! For now, you can use the legacy board view.
            </p>
            <Link
              href={`/board?project=${projectId}`}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Kanban className="h-4 w-4" />
              Open Legacy Board
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}