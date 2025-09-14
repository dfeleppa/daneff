'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { getProjects } from '@/lib/api/projects'
import { getUserWorkspaces } from '@/lib/api/users'
import { Plus, Calendar, Users, CheckCircle, FolderOpen } from 'lucide-react'

interface Project {
  id: string
  name: string
  description: string | null
  status: string
  created_at: string
  updated_at: string
  task_count?: number
}

interface Workspace {
  id: string
  name: string
  slug: string
  description: string | null
}

export default function WorkspaceProjectsPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const [projects, setProjects] = useState<Project[]>([])
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [loading, setLoading] = useState(true)

  const workspaceId = params.workspaceId as string

  useEffect(() => {
    if (session?.user?.id && workspaceId) {
      loadData()
    }
  }, [session?.user?.id, workspaceId])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Load workspace info
      const workspaces = await getUserWorkspaces(session!.user.id)
      const currentWorkspace = workspaces.find(w => w.id === workspaceId)
      if (currentWorkspace) {
        setWorkspace(currentWorkspace)
      }

      // Load projects
      const { projects: projectsData } = await getProjects(workspaceId)
      setProjects(projectsData)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateProject = () => {
    router.push(`/workspace/${workspaceId}/projects/new`)
  }

  const handleProjectClick = (projectId: string) => {
    router.push(`/workspace/${workspaceId}/project/${projectId}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {workspace?.name} Projects
          </h1>
          <p className="text-gray-600 mt-2">
            Manage and view all projects in this workspace
          </p>
        </div>
        <button
          onClick={handleCreateProject}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Project
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="bg-gray-100 rounded-full p-6">
              <FolderOpen className="h-12 w-12 text-gray-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">No projects yet</h3>
              <p className="text-gray-600 mt-1">
                Create your first project to get started organizing your tasks
              </p>
            </div>
            <button
              onClick={handleCreateProject}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Create Project
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div 
              key={project.id} 
              className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow cursor-pointer p-6"
              onClick={() => handleProjectClick(project.id)}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{project.name}</h3>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  project.status === 'active' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {project.status}
                </span>
              </div>
              
              {project.description && (
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {project.description}
                </p>
              )}
              
              <div className="flex items-center justify-between text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" />
                  <span>{project.task_count || 0} tasks</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {new Date(project.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}