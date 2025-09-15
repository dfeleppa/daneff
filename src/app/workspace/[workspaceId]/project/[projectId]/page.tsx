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
  Activity,
} from 'lucide-react'
import { getUserWorkspaces } from '@/lib/api/users'
import { getProjects } from '@/lib/api/projects'
import AppLayout from '@/components/AppLayout'
import PageHeader from '@/components/PageHeader'

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
      const userWorkspaces = await getUserWorkspaces(session!.user.id)
      const currentWorkspace = userWorkspaces.find(w => w.id === workspaceId)
      if (!currentWorkspace) {
        setError('Workspace not found or you do not have access')
        return
      }
      setWorkspace(currentWorkspace)
      const projectsResult = await getProjects(workspaceId)
      const currentProject = projectsResult.projects?.find(p => p.id === projectId)
      if (!currentProject) {
        setError('Project not found or you do not have access')
        return
      }
      setProject(currentProject)
    } catch (e) {
      console.error('Error loading project data:', e)
      setError('Failed to load project data')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
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

  if (!workspace || !project) return null

  return (
    <AppLayout>
      <PageHeader
        overline="Project"
        title={project.name}
        meta={(
          <div className="flex flex-wrap items-center text-xs sm:text-sm text-gray-500 gap-x-4 gap-y-1">
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                project.status === 'active'
                  ? 'bg-green-100 text-green-700'
                  : project.status === 'completed'
                  ? 'bg-blue-100 text-blue-700'
                  : project.status === 'on_hold'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {project.status.replace('_', ' ')}
            </span>
            <div className="flex items-center">
              <Calendar className="w-3.5 h-3.5 mr-1" />
              <span>Created {new Date(project.created_at).toLocaleDateString()}</span>
            </div>
            {project.description && (
              <span className="truncate max-w-xs hidden sm:inline text-gray-600">{project.description}</span>
            )}
          </div>
        )}
        actions={(
          <Link
            href={`/workspace/${workspace.id}`}
            className="inline-flex items-center px-3 py-1.5 rounded-md text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Workspace
          </Link>
        )}
      />
      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          <Link
            href={`/workspace/${workspace.id}/project/${project.id}/board`}
            className="group bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-xl p-6 hover:shadow-md transition-all duration-200 hover:bg-white"
          >
            <div className="flex items-center justify-center mb-4">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <Kanban className="w-7 h-7 text-white" />
              </div>
            </div>
            <h3 className="text-base font-semibold text-gray-800 mb-2 text-center group-hover:text-blue-600 transition-colors">
              Board View
            </h3>
            <p className="text-gray-600 text-center text-xs">
              Kanban-style board with drag & drop task management
            </p>
          </Link>
          <Link
            href={`/workspace/${workspace.id}/project/${project.id}/list`}
            className="group bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-xl p-6 hover:shadow-md transition-all duration-200 hover:bg-white"
          >
            <div className="flex items-center justify-center mb-4">
              <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                <List className="w-7 h-7 text-white" />
              </div>
            </div>
            <h3 className="text-base font-semibold text-gray-800 mb-2 text-center group-hover:text-green-600 transition-colors">
              List View
            </h3>
            <p className="text-gray-600 text-center text-xs">
              Table-style list with detailed task information and sorting
            </p>
          </Link>
          <Link
            href={`/workspace/${workspace.id}/project/${project.id}/gantt`}
            className="group bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-xl p-6 hover:shadow-md transition-all duration-200 hover:bg-white"
          >
            <div className="flex items-center justify-center mb-4">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-7 h-7 text-white" />
              </div>
            </div>
            <h3 className="text-base font-semibold text-gray-800 mb-2 text-center group-hover:text-purple-600 transition-colors">
              Gantt Chart
            </h3>
            <p className="text-gray-600 text-center text-xs">
              Timeline view with project scheduling and dependencies
            </p>
          </Link>
        </div>
        <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-xl p-6">
          <h3 className="text-base font-semibold text-gray-800 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button className="flex items-center space-x-3 p-3 bg-gray-50/50 rounded-lg hover:bg-gray-100/50 transition-colors text-sm">
              <Settings className="w-4 h-4 text-gray-600" />
              <span className="text-gray-700 font-medium">Project Settings</span>
            </button>
            <button className="flex items-center space-x-3 p-3 bg-gray-50/50 rounded-lg hover:bg-gray-100/50 transition-colors text-sm">
              <Users className="w-4 h-4 text-gray-600" />
              <span className="text-gray-700 font-medium">Manage Team</span>
            </button>
            <button className="flex items-center space-x-3 p-3 bg-gray-50/50 rounded-lg hover:bg-gray-100/50 transition-colors text-sm">
              <Activity className="w-4 h-4 text-gray-600" />
              <span className="text-gray-700 font-medium">View Activity</span>
            </button>
          </div>
        </div>
      </main>
    </AppLayout>
  )
}
