'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import AppLayout from '@/components/AppLayout'
import { 
  Building, 
  Folder, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Users,
  Calendar,
  TrendingUp
} from 'lucide-react'
import { getUserWorkspaces } from '@/lib/api/users'
import { getProjects, getProjectTasks } from '@/lib/api/projects'

interface Workspace {
  id: string
  name: string
  description?: string
}

interface Project {
  id: string
  name: string
  workspace_id: string
  workspace?: Workspace
}

interface Task {
  id: string
  title: string
  status: 'todo' | 'in_progress' | 'done'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  due_date?: string
  project_id: string
  project?: Project
}

export default function OverallDashboard() {
  const { data: session } = useSession()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session?.user?.id) {
      loadDashboardData()
    }
  }, [session])

  const loadDashboardData = async () => {
    try {
      setLoading(true)

      // Load workspaces using the API function
      const userWorkspaces = await getUserWorkspaces(session!.user.id)
      setWorkspaces(userWorkspaces)

      // Load projects from all workspaces
      const allProjects: Project[] = []
      for (const workspace of userWorkspaces) {
        try {
          const { projects } = await getProjects(workspace.id)
          allProjects.push(...projects.map(p => ({ 
            ...p, 
            workspace: { id: workspace.id, name: workspace.name } 
          })))
        } catch (error) {
          console.error(`Error loading projects for workspace ${workspace.id}:`, error)
        }
      }
      setProjects(allProjects)

      // Load tasks from all projects
      const allTasks: Task[] = []
      for (const project of allProjects) {
        try {
          const { tasks: projectTasks } = await getProjectTasks(project.id)
          allTasks.push(...projectTasks.map(t => ({
            id: t.id,
            title: t.title,
            status: t.status?.name?.toLowerCase() === 'done' ? 'done' as const : 
                   t.status?.name?.toLowerCase() === 'in progress' ? 'in_progress' as const : 
                   'todo' as const,
            priority: t.priority,
            due_date: t.due_date || undefined,
            project_id: t.project_id,
            project: { 
              id: project.id, 
              name: project.name, 
              workspace_id: project.workspace_id,
              workspace: project.workspace 
            }
          })))
        } catch (error) {
          console.error(`Error loading tasks for project ${project.id}:`, error)
        }
      }
      setTasks(allTasks.slice(0, 50)) // Limit to 50 most recent tasks
      
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate stats
  const totalTasks = tasks.length
  const completedTasks = tasks.filter(t => t.status === 'done').length
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length
  const overdueTasks = tasks.filter(t => 
    t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done'
  ).length

  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  // Get recent tasks
  const recentTasks = tasks.slice(0, 10)

  if (!session) {
    return null
  }

  return (
    <AppLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">Overview of all your workspaces, projects, and tasks</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Workspaces</p>
                    <p className="text-2xl font-bold text-gray-900">{workspaces.length}</p>
                  </div>
                  <Building className="w-8 h-8 text-blue-600" />
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Projects</p>
                    <p className="text-2xl font-bold text-gray-900">{projects.length}</p>
                  </div>
                  <Folder className="w-8 h-8 text-green-600" />
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Tasks</p>
                    <p className="text-2xl font-bold text-gray-900">{totalTasks}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-purple-600" />
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                    <p className="text-2xl font-bold text-gray-900">{completionRate}%</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-orange-600" />
                </div>
              </div>
            </div>

            {/* Task Status Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <div className="flex items-center space-x-3 mb-4">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Completed</h3>
                </div>
                <p className="text-3xl font-bold text-green-600">{completedTasks}</p>
                <p className="text-sm text-gray-600 mt-1">Tasks completed</p>
              </div>

              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <div className="flex items-center space-x-3 mb-4">
                  <Clock className="w-6 h-6 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">In Progress</h3>
                </div>
                <p className="text-3xl font-bold text-blue-600">{inProgressTasks}</p>
                <p className="text-sm text-gray-600 mt-1">Tasks in progress</p>
              </div>

              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <div className="flex items-center space-x-3 mb-4">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Overdue</h3>
                </div>
                <p className="text-3xl font-bold text-red-600">{overdueTasks}</p>
                <p className="text-sm text-gray-600 mt-1">Tasks overdue</p>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Recent Tasks</h3>
                <p className="text-sm text-gray-600">Latest tasks across all workspaces</p>
              </div>
              <div className="p-6">
                {recentTasks.length > 0 ? (
                  <div className="space-y-4">
                    {recentTasks.map((task) => (
                      <div key={task.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{task.title}</h4>
                          <p className="text-sm text-gray-600">
                            {task.project?.name} · {task.project?.workspace?.name}
                          </p>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            task.status === 'done' 
                              ? 'bg-green-100 text-green-800'
                              : task.status === 'in_progress'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {task.status.replace('_', ' ')}
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            task.priority === 'high' 
                              ? 'bg-red-100 text-red-800'
                              : task.priority === 'medium'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {task.priority}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No tasks found</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}