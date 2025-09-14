'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import AppLayout from '@/components/AppLayout'
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal,
  Users,
  Calendar,
  Settings,
  Trash2,
  Edit3,
  FolderOpen,
  Activity,
  RefreshCw,
  BarChart3
} from 'lucide-react'
import { getUserWorkspaces, createSupabaseUser } from '@/lib/api/users'
import { getProjects, createProject, updateProject, deleteProject } from '@/lib/api/projects'
import { syncProjectsWithCalendar, hasCalendarPermission, createProjectCalendarEvent } from '@/lib/api/calendar'

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
  members?: any[]
  owner?: any
}

export default function ProjectsPage() {
  const { data: session, status } = useSession()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [createLoading, setCreateLoading] = useState(false)
  const [updateLoading, setUpdateLoading] = useState(false)
  const [calendarSyncLoading, setCalendarSyncLoading] = useState(false)
  const [hasCalendarAccess, setHasCalendarAccess] = useState(false)
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    color: '#3b82f6',
    status: 'active',
    due_date: '',
  })

  // Clear messages after 5 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null)
        setSuccess(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [error, success])

  useEffect(() => {
    if (session?.user?.id) {
      loadProjects()
      checkCalendarPermission()
    }
  }, [session])

  useEffect(() => {
    filterProjects()
  }, [projects, searchTerm, statusFilter])

  const loadProjects = async () => {
    if (!session?.user?.id) return

    try {
      setLoading(true)

      // Get user's workspaces
      const userWorkspaces = await getUserWorkspaces(session.user.id)
      
      // If no workspaces exist, create one automatically
      if (userWorkspaces.length === 0 && session.user.email && session.user.name) {
        console.log('No workspaces found, creating default workspace...')
        
        // Trigger user sync which will create a default workspace
        await createSupabaseUser({
          email: session.user.email,
          name: session.user.name,
          avatar_url: session.user.image || null,
          google_id: session.user.id,
        })
        
        // Wait a moment for the workspace to be created
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        // Try to get workspaces again
        const refreshedWorkspaces = await getUserWorkspaces(session.user.id)
        setWorkspaces(refreshedWorkspaces)
        
        if (refreshedWorkspaces.length > 0) {
          // Get projects from the first workspace
          const { projects: workspaceProjects } = await getProjects(refreshedWorkspaces[0].id)
          setProjects(workspaceProjects)
        }
      } else {
        setWorkspaces(userWorkspaces)
        
        if (userWorkspaces.length > 0) {
          // Get projects from the first workspace
          const { projects: workspaceProjects } = await getProjects(userWorkspaces[0].id)
          setProjects(workspaceProjects)
        }
      }
    } catch (error) {
      console.error('Error loading projects:', error)
      setError('Failed to load projects. Please refresh the page.')
    } finally {
      setLoading(false)
    }
  }

  const filterProjects = () => {
    let filtered = projects

    if (searchTerm) {
      filtered = filtered.filter(project =>
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(project => project.status === statusFilter)
    }

    setFilteredProjects(filtered)
  }

  const createWorkspaceManually = async () => {
    if (!session?.user?.email || !session?.user?.name) return
    
    try {
      setError('Creating workspace...')
      setLoading(true)
      
      await createSupabaseUser({
        email: session.user.email,
        name: session.user.name,
        avatar_url: session.user.image || null,
        google_id: session.user.id,
      })
      
      // Wait and reload
      setTimeout(() => {
        setError(null)
        loadProjects()
      }, 2000)
      
    } catch (error) {
      console.error('Failed to create workspace:', error)
      setError('Failed to create workspace. Please try again.')
      setLoading(false)
    }
  }

  const checkCalendarPermission = async () => {
    try {
      const hasAccess = await hasCalendarPermission()
      setHasCalendarAccess(hasAccess)
    } catch (error) {
      console.error('Error checking calendar permission:', error)
      setHasCalendarAccess(false)
    }
  }

  const handleSyncWithCalendar = async () => {
    if (!hasCalendarAccess) {
      setError('Google Calendar access not available. Please sign out and sign in again to grant calendar permissions.')
      return
    }

    try {
      setCalendarSyncLoading(true)
      await syncProjectsWithCalendar(projects)
      setSuccess('✅ Projects synced with Google Calendar!')
    } catch (error) {
      console.error('Error syncing with calendar:', error)
      setError('Failed to sync with Google Calendar. Please try again.')
    } finally {
      setCalendarSyncLoading(false)
    }
  }

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session?.user?.id) {
      setError('Please sign in to create projects')
      return
    }

    if (!workspaces || workspaces.length === 0) {
      setError('No workspace found. Creating workspace automatically...')
      
      // Try to create workspace automatically
      if (session.user.email && session.user.name) {
        try {
          await createSupabaseUser({
            email: session.user.email,
            name: session.user.name,
            avatar_url: session.user.image || null,
            google_id: session.user.id,
          })
          
          // Reload projects to get the new workspace
          setTimeout(() => {
            setError(null)
            loadProjects()
          }, 2000)
          
          return
        } catch (error) {
          console.error('Failed to create workspace:', error)
          setError('Failed to create workspace. Please refresh the page and try again.')
          return
        }
      } else {
        setError('No workspace found. Please sign out and back in to create your workspace.')
        return
      }
    }

    try {
      setError(null)
      setCreateLoading(true)
      
      console.log('Creating project with workspace:', workspaces[0])
      console.log('User ID:', session.user.id)
      
      const { project, error: createError } = await createProject({
        name: newProject.name,
        description: newProject.description || null,
        color: newProject.color,
        status: newProject.status as 'active' | 'on_hold' | 'completed' | 'archived',
        workspace_id: workspaces[0].id,
        owner_id: session.user.id,
        due_date: newProject.due_date || null,
      })

      if (createError) {
        console.error('Create project error:', createError)
        setError(`Failed to create project: ${createError.message}`)
        return
      }

      if (project) {
        setProjects([project, ...projects])
        setShowCreateModal(false)
        setNewProject({
          name: '',
          description: '',
          color: '#3b82f6',
          status: 'active',
          due_date: '',
        })
        setSuccess('Project created successfully!')
        
        // Create calendar event if due date is set and calendar is available
        if (project.due_date && hasCalendarAccess) {
          try {
            await createProjectCalendarEvent(project)
            setSuccess('Project created and added to Google Calendar!')
          } catch (error) {
            console.error('Error creating calendar event:', error)
            // Don't fail the project creation if calendar sync fails
          }
        }
        
        // Reload projects to ensure consistency
        setTimeout(() => loadProjects(), 1000)
      }
    } catch (error: any) {
      console.error('Error creating project:', error)
      setError(`Failed to create project: ${error.message || 'Unknown error'}`)
    } finally {
      setCreateLoading(false)
    }
  }

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingProject) return

    try {
      setError(null)
      setUpdateLoading(true)
      const { project } = await updateProject(editingProject.id, {
        name: editingProject.name,
        description: editingProject.description,
        color: editingProject.color,
        status: editingProject.status,
      })

      if (project) {
        setProjects(projects.map(p => p.id === project.id ? project : p))
        setEditingProject(null)
        setSuccess('Project updated successfully!')
      }
    } catch (error) {
      console.error('Error updating project:', error)
      setError('Failed to update project. Please try again.')
    } finally {
      setUpdateLoading(false)
    }
  }

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return
    }

    try {
      setError(null)
      const { success } = await deleteProject(projectId)

      if (success) {
        setProjects(projects.filter(p => p.id !== projectId))
        setSuccess('Project deleted successfully!')
      }
    } catch (error) {
      console.error('Error deleting project:', error)
      setError('Failed to delete project. Please try again.')
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Please sign in to continue</h1>
          <Link
            href="/auth/signin"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Sign In
          </Link>
        </div>
      </div>
    )
  }

  const projectColors = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', 
    '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1'
  ]

  const projectActions = (
    <>
      <button
        onClick={() => setShowCreateModal(true)}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
      >
        <Plus className="h-4 w-4 mr-2" />
        New Project
      </button>
      <button
        onClick={loadProjects}
        disabled={loading}
        className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 flex items-center disabled:opacity-50"
      >
        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
        Refresh
      </button>
      {hasCalendarAccess && (
        <button
          onClick={handleSyncWithCalendar}
          disabled={calendarSyncLoading}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center disabled:opacity-50"
        >
          <Calendar className={`h-4 w-4 mr-2 ${calendarSyncLoading ? 'animate-pulse' : ''}`} />
          {calendarSyncLoading ? 'Syncing...' : 'Sync Calendar'}
        </button>
      )}
    </>
  )

  return (
    <AppLayout actions={projectActions}>
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
        {/* Error and Success Messages */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-800">{success}</p>
              </div>
            </div>
          </div>
        )}

        {/* Project Stats */}
        {projects.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm font-medium text-gray-500">Total Projects</div>
              <div className="text-2xl font-bold text-gray-900">{projects.length}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm font-medium text-gray-500">Active</div>
              <div className="text-2xl font-bold text-green-600">{projects.filter(p => p.status === 'active').length}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm font-medium text-gray-500">Completed</div>
              <div className="text-2xl font-bold text-blue-600">{projects.filter(p => p.status === 'completed').length}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm font-medium text-gray-500">On Hold</div>
              <div className="text-2xl font-bold text-yellow-600">{projects.filter(p => p.status === 'on_hold').length}</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow mb-6 p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="on_hold">On Hold</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
        </div>

        {/* Projects Grid */}
        {filteredProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <div key={project.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: project.color }}
                      ></div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {project.name}
                      </h3>
                    </div>
                    <div className="relative">
                      <button className="text-gray-400 hover:text-gray-600 p-1">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <p className="text-gray-600 mb-4 text-sm">
                    {project.description || 'No description available'}
                  </p>

                  <div className="flex items-center justify-between mb-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      project.status === 'active' 
                        ? 'bg-green-100 text-green-800'
                        : project.status === 'completed'
                        ? 'bg-blue-100 text-blue-800'
                        : project.status === 'on_hold'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                    </span>
                    
                    {project.members && project.members.length > 0 && (
                      <div className="flex items-center space-x-1 text-sm text-gray-500">
                        <Users className="h-4 w-4" />
                        <span>{project.members.length}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {new Date(project.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setEditingProject(project)}
                        className="text-gray-400 hover:text-blue-600 p-1"
                        title="Edit project"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <Link
                        href={`/board?project=${project.id}`}
                        className="text-gray-400 hover:text-green-600 p-1"
                        title="View board"
                      >
                        <Activity className="h-4 w-4" />
                      </Link>
                      <Link
                        href={`/gantt?project=${project.id}`}
                        className="text-gray-400 hover:text-purple-600 p-1"
                        title="View gantt chart"
                      >
                        <BarChart3 className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => handleDeleteProject(project.id)}
                        className="text-gray-400 hover:text-red-600 p-1"
                        title="Delete project"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <FolderOpen className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {projects.length === 0 ? 'No projects yet' : 'No projects match your filters'}
            </h3>
            <p className="text-gray-500 mb-6">
              {projects.length === 0 
                ? 'Create your first project to get started'
                : 'Try adjusting your search or filter criteria'
              }
            </p>
            {projects.length === 0 && (
              <>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 inline-flex items-center mr-3"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Project
                </button>
                {workspaces.length === 0 && (
                  <button
                    onClick={createWorkspaceManually}
                    disabled={loading}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 inline-flex items-center disabled:opacity-50"
                  >
                    <FolderOpen className="h-4 w-4 mr-2" />
                    Create Workspace
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Create New Project</h2>
            <form onSubmit={handleCreateProject}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project Name *
                </label>
                <input
                  type="text"
                  required
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter project name"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-20"
                  placeholder="Enter project description"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color
                </label>
                <div className="flex flex-wrap gap-2">
                  {projectColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewProject({ ...newProject, color })}
                      className={`w-8 h-8 rounded border-2 ${
                        newProject.color === color ? 'border-gray-800' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Due Date (Optional)
                </label>
                <input
                  type="date"
                  value={newProject.due_date}
                  onChange={(e) => setNewProject({ ...newProject, due_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {hasCalendarAccess && newProject.due_date && (
                  <p className="text-sm text-green-600 mt-1">
                    📅 Will be added to Google Calendar
                  </p>
                )}
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={newProject.status}
                  onChange={(e) => setNewProject({ ...newProject, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="on_hold">On Hold</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {createLoading && (
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  {createLoading ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {editingProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Edit Project</h2>
            <form onSubmit={handleUpdateProject}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project Name *
                </label>
                <input
                  type="text"
                  required
                  value={editingProject.name}
                  onChange={(e) => setEditingProject({ ...editingProject, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={editingProject.description || ''}
                  onChange={(e) => setEditingProject({ ...editingProject, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-20"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color
                </label>
                <div className="flex flex-wrap gap-2">
                  {projectColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setEditingProject({ ...editingProject, color })}
                      className={`w-8 h-8 rounded border-2 ${
                        editingProject.color === color ? 'border-gray-800' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={editingProject.status}
                  onChange={(e) => setEditingProject({ ...editingProject, status: e.target.value as 'active' | 'on_hold' | 'completed' | 'archived' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="on_hold">On Hold</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {updateLoading && (
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  {updateLoading ? 'Updating...' : 'Update Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    </AppLayout>
  )
}
