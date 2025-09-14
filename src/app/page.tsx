'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import AppLayout from '@/components/AppLayout'
import { 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Plus, 
  TrendingUp,
  Users,
  FolderOpen,
  Activity
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import { getUserWorkspaces } from '@/lib/api/users'
import { getProjects, getProjectTasks } from '@/lib/api/projects'

interface Workspace {
  id: string
  name: string
  slug: string
  created_at: string
}

interface Project {
  id: string
  title: string
  description?: string
  status: 'active' | 'completed' | 'on-hold'
  workspace_id: string
  created_at: string
}

interface Task {
  id: string
  title: string
  description?: string
  status: any
  priority?: 'low' | 'medium' | 'high'
  due_date?: string
  project_id: string
  created_at: string
  assignee?: any
}

function DashboardContent() {
  const { data: session, status } = useSession()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    overdueTasks: 0,
    activeProjects: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session?.user?.id) {
      loadDashboardData()
    }
  }, [session])

  const loadDashboardData = async () => {
    if (!session?.user?.id) return

    try {
      setLoading(true)

      const userWorkspaces = await getUserWorkspaces(session.user.id)
      setWorkspaces(userWorkspaces)

      if (userWorkspaces.length > 0) {
        const workspaceProjectsResult = await getProjects(userWorkspaces[0].id)
        const workspaceProjects = workspaceProjectsResult.projects || []
        setProjects(workspaceProjects)

        let allTasks: any[] = []
        for (const project of workspaceProjects) {
          const projectTasksResult = await getProjectTasks(project.id)
          const projectTasks = projectTasksResult.tasks || []
          allTasks = [...allTasks, ...projectTasks]
        }
        setTasks(allTasks)

        // Calculate stats
        const totalCompleted = allTasks.filter(task => task.status?.name === 'Completed').length
        const totalOverdue = allTasks.filter(task => 
          task.due_date && new Date(task.due_date) < new Date() && task.status?.name !== 'Completed'
        ).length

        setStats({
          totalTasks: allTasks.length,
          completedTasks: totalCompleted,
          overdueTasks: totalOverdue,
          activeProjects: workspaceProjects.filter((p: Project) => p.status === 'active').length
        })
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Prepare computed data
  const recentTasks = tasks
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)

  const upcomingTasks = tasks
    .filter(task => task.due_date && new Date(task.due_date) > new Date())
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
    .slice(0, 3)

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
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Welcome to TaskFlow</h1>
          <p className="text-gray-600 mb-6">Please sign in to access your dashboard</p>
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

  return (
    <AppLayout>
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          {/* Welcome Message */}
          <div className="mb-8">
            <p className="text-lg text-gray-600">Welcome back, {session.user?.name}</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-white/20 p-6 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Tasks</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalTasks}</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <CheckCircle2 className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-white/20 p-6 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-green-600">{stats.completedTasks}</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-white/20 p-6 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Overdue</p>
                  <p className="text-2xl font-bold text-red-600">{stats.overdueTasks}</p>
                </div>
                <div className="p-3 bg-red-50 rounded-lg">
                  <Clock className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </div>

            <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-white/20 p-6 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Projects</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.activeProjects}</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <FolderOpen className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Recent Tasks */}
            <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Recent Tasks</h2>
              </div>
              <div className="p-6">
                {recentTasks.length > 0 ? (
                  <div className="space-y-4">
                    {recentTasks.map((task) => (
                      <div key={task.id} className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                        <div 
                          className="w-3 h-3 rounded-full mt-2 flex-shrink-0"
                          style={{ backgroundColor: task.status?.color || '#6b7280' }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {task.title}
                          </p>
                          <div className="flex items-center space-x-2 mt-1">
                            {task.priority && (
                              <span 
                                className={`text-xs px-2 py-1 rounded-full font-medium
                                  ${task.priority === 'high' ? 'bg-red-100 text-red-600' : ''}
                                  ${task.priority === 'medium' ? 'bg-yellow-100 text-yellow-600' : ''}
                                  ${task.priority === 'low' ? 'bg-green-100 text-green-600' : ''}
                                `}
                              >
                                {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No recent tasks</p>
                )}
              </div>
            </div>

            {/* Upcoming Tasks */}
            <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Upcoming Tasks</h2>
              </div>
              <div className="p-6">
                {upcomingTasks.length > 0 ? (
                  <div className="space-y-4">
                    {upcomingTasks.map((task) => (
                      <div key={task.id} className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                        <Calendar className="h-4 w-4 text-blue-500 mt-1 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {task.title}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Due: {new Date(task.due_date!).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No upcoming tasks</p>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Link
                  href="/board"
                  className="flex items-center p-4 rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-colors group"
                >
                  <Activity className="h-5 w-5 text-gray-400 group-hover:text-blue-500 mr-3" />
                  <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700">View Kanban Board</span>
                </Link>
                
                <Link
                  href="/projects"
                  className="flex items-center p-4 rounded-lg border-2 border-dashed border-gray-300 hover:border-green-500 hover:bg-green-50 transition-colors group"
                >
                  <FolderOpen className="h-5 w-5 text-gray-400 group-hover:text-green-500 mr-3" />
                  <span className="text-sm font-medium text-gray-700 group-hover:text-green-700">Manage Projects</span>
                </Link>
                
                <Link
                  href="/gantt"
                  className="flex items-center p-4 rounded-lg border-2 border-dashed border-gray-300 hover:border-purple-500 hover:bg-purple-50 transition-colors group"
                >
                  <Calendar className="h-5 w-5 text-gray-400 group-hover:text-purple-500 mr-3" />
                  <span className="text-sm font-medium text-gray-700 group-hover:text-purple-700">View Gantt Chart</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

export default function Dashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
}