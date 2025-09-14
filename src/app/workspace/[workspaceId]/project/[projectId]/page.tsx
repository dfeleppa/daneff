'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft,
  Kanban,
  List,
  Calendar,
  BarChart3,
  Settings,
  Users,
  Activity
} from 'lucide-react'
import { getUserWorkspaces } from '@/lib/api/users'
import { getProjects } from '@/lib/api/projects'
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

interface Project {
  id: string
  name: string
  description: string | null
  color: string
  status: 'active' | 'on_hold' | 'completed' | 'archived'
  workspace_id: string
  owner_id: string
  created_at: string
}

export default function ProjectPage() {
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
      loadProjectData()
    }
  }, [status, session, workspaceId, projectId])

  const loadProjectData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Get workspace details
      const userWorkspaces = await getUserWorkspaces(session!.user.id)
      const currentWorkspace = userWorkspaces.find(w => w.id === workspaceId)
      
      if (!currentWorkspace) {
        setError('Workspace not found or you do not have access')
        return
      }
      
      setWorkspace(currentWorkspace)

      // Get project details
      const projectsResult = await getProjects(workspaceId)
      const currentProject = projectsResult.projects?.find(p => p.id === projectId)
      
      if (!currentProject) {
        setError('Project not found or you do not have access')
        return
      }
      
      setProject(currentProject)

    } catch (error) {
      console.error('Error loading project data:', error)
      setError('Failed to load project data')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading project...</p>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    router.push('/')
    return null
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

  if (!workspace || !project) {
    return null
  }

  return (
    <AppLayout>
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href={`/workspace/${workspace.id}`}
                className="text-gray-500 hover:text-blue-600 flex items-center transition-colors"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                {workspace.name}
              </Link>
              <span className="text-gray-300">/</span>
              <div className="flex items-center space-x-3">
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: project.color || '#3B82F6' }}
                >
                  <span className="text-white text-sm font-bold">
                    {project.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  {project.name}
                </h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {session?.user && (
                <div className="flex items-center space-x-3">
                  {session.user.image ? (
                    <img
                      src={session.user.image}
                      alt={session.user.name || 'User'}
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {session.user.name?.charAt(0) || 'U'}
                      </span>
                    </div>
                  )}
                  <span className="text-gray-700 font-medium">{session.user.name}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Project Info */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-4xl font-bold text-gray-800 mb-2">
                {project.name}
              </h2>
              {project.description && (
                <p className="text-xl text-gray-600">{project.description}</p>
              )}
              <div className="flex items-center mt-4 text-sm text-gray-500 space-x-6">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  project.status === 'active' ? 'bg-green-100 text-green-800' :
                  project.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                  project.status === 'on_hold' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {project.status.replace('_', ' ')}
                </span>
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  <span>Created {new Date(project.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* View Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <Link
            href={`/workspace/${workspace.id}/project/${project.id}/board`}
            className="group bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-8 hover:shadow-lg transition-all duration-200 hover:scale-105 hover:bg-white/90"
          >
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center">
                <Kanban className="w-8 h-8 text-white" />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2 text-center group-hover:text-blue-600 transition-colors">
              Board View
            </h3>
            <p className="text-gray-600 text-center text-sm">
              Kanban-style board with drag & drop task management
            </p>
          </Link>

          <Link
            href={`/workspace/${workspace.id}/project/${project.id}/list`}
            className="group bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-8 hover:shadow-lg transition-all duration-200 hover:scale-105 hover:bg-white/90"
          >
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center">
                <List className="w-8 h-8 text-white" />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2 text-center group-hover:text-green-600 transition-colors">
              List View
            </h3>
            <p className="text-gray-600 text-center text-sm">
              Table-style list with detailed task information and sorting
            </p>
          </Link>

          <Link
            href={`/workspace/${workspace.id}/project/${project.id}/gantt`}
            className="group bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-8 hover:shadow-lg transition-all duration-200 hover:scale-105 hover:bg-white/90"
          >
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl flex items-center justify-center">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2 text-center group-hover:text-purple-600 transition-colors">
              Gantt Chart
            </h3>
            <p className="text-gray-600 text-center text-sm">
              Timeline view with project scheduling and dependencies
            </p>
          </Link>
        </div>

        {/* Quick Actions */}
        <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-8">
          <h3 className="text-xl font-semibold text-gray-800 mb-6">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="flex items-center space-x-3 p-4 bg-gray-50/50 rounded-lg hover:bg-gray-100/50 transition-colors">
              <Settings className="w-5 h-5 text-gray-600" />
              <span className="text-gray-700 font-medium">Project Settings</span>
            </button>
            
            <button className="flex items-center space-x-3 p-4 bg-gray-50/50 rounded-lg hover:bg-gray-100/50 transition-colors">
              <Users className="w-5 h-5 text-gray-600" />
              <span className="text-gray-700 font-medium">Manage Team</span>
            </button>
            
            <button className="flex items-center space-x-3 p-4 bg-gray-50/50 rounded-lg hover:bg-gray-100/50 transition-colors">
              <Activity className="w-5 h-5 text-gray-600" />
              <span className="text-gray-700 font-medium">View Activity</span>
            </button>
          </div>
        </div>
      </main>
    </AppLayout>
  )
}