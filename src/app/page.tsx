'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Plus, 
  TrendingUp,
  Users,
  FolderOpen,
  Activity,
  Search,
  Bell,
  Settings,
  User,
  LogOut
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import { getUserWorkspaces } from '@/lib/api/users'
import { getProjects, getProjectTasks } from '@/lib/api/projects'

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
  status: string
  workspace_id: string
  owner_id: string
  created_at: string
  members?: any[]
}

interface Task {
  id: string
  title: string
  description: string | null
  status_id: string
  priority: string
  due_date: string | null
  created_at: string
  assignee?: any
  status?: any
}

export default function Dashboard() {
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
  const [showUserMenu, setShowUserMenu] = useState(false)

  useEffect(() => {
    if (session?.user?.id) {
      loadDashboardData()
    }
  }, [session])

  const loadDashboardData = async () => {
    if (!session?.user?.id) return

    try {
      setLoading(true)

      // Get user's workspaces
      const userWorkspaces = await getUserWorkspaces(session.user.id)
      setWorkspaces(userWorkspaces)

      if (userWorkspaces.length > 0) {
        // Get projects from the first workspace (or all workspaces)
        const { projects: workspaceProjects } = await getProjects(userWorkspaces[0].id)
        setProjects(workspaceProjects)

        // Get tasks from all projects
        let allTasks: Task[] = []
        let totalCompleted = 0
        let totalOverdue = 0

        for (const project of workspaceProjects) {
          const { tasks: projectTasks } = await getProjectTasks(project.id)
          allTasks = [...allTasks, ...projectTasks]
        }

        setTasks(allTasks)

        // Calculate stats
        const now = new Date()
        totalCompleted = allTasks.filter(task => 
          task.status?.name?.toLowerCase() === 'done'
        ).length

        totalOverdue = allTasks.filter(task => 
          task.due_date && 
          new Date(task.due_date) < now && 
          task.status?.name?.toLowerCase() !== 'done'
        ).length

        setStats({
          totalTasks: allTasks.length,
          completedTasks: totalCompleted,
          overdueTasks: totalOverdue,
          activeProjects: workspaceProjects.filter(p => p.status === 'active').length
        })
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = () => {
    signOut({ callbackUrl: '/auth/signin' })
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

  const recentTasks = tasks
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)

  const upcomingTasks = tasks
    .filter(task => task.due_date && new Date(task.due_date) > new Date())
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
    .slice(0, 3)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-blue-600">TaskFlow</h1>
              <nav className="hidden md:ml-6 md:flex md:space-x-8">
                <Link href="/" className="text-gray-900 hover:text-blue-600 px-3 py-2 text-sm font-medium">
                  Dashboard
                </Link>
                <Link href="/projects" className="text-gray-500 hover:text-blue-600 px-3 py-2 text-sm font-medium">
                  Projects
                </Link>
                <Link href="/board" className="text-gray-500 hover:text-blue-600 px-3 py-2 text-sm font-medium">
                  Board
                </Link>
              </nav>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search tasks, projects..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <Link
                href="/projects"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Project
              </Link>
              <Bell className="w-5 h-5 text-gray-400 hover:text-gray-600 cursor-pointer" />
              <Settings className="w-5 h-5 text-gray-400 hover:text-gray-600 cursor-pointer" />
              
              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {session?.user?.image ? (
                    <img
                      className="w-8 h-8 rounded-full"
                      src={session.user.image}
                      alt={session.user.name || 'User'}
                    />
                  ) : (
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                  )}
                </button>
                
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
                    <div className="px-4 py-2 text-sm text-gray-700 border-b">
                      <p className="font-medium">{session?.user?.name}</p>
                      <p className="text-gray-500">{session?.user?.email}</p>
                    </div>
                    <button
                      onClick={handleSignOut}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <LogOut className="w-4 h-4 mr-3" />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {session.user?.name?.split(' ')[0] || 'User'}!
          </h2>
          <p className="text-gray-600">Here's what's happening with your projects today.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Tasks</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalTasks}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900">{stats.completedTasks}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Overdue</p>
                <p className="text-2xl font-bold text-gray-900">{stats.overdueTasks}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <FolderOpen className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Projects</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeProjects}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Tasks */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Recent Tasks</h2>
            </div>
            <div className="p-6">
              {recentTasks.length > 0 ? (
                <div className="space-y-4">
                  {recentTasks.map((task) => (
                    <div key={task.id} className="flex items-center space-x-3">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: task.status?.color || '#6b7280' }}
                      ></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {task.title}
                        </p>
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <span>{task.status?.name || 'No Status'}</span>
                          {task.priority && (
                            <>
                              <span>•</span>
                              <span className={`
                                ${task.priority === 'high' ? 'text-red-600' : ''}
                                ${task.priority === 'medium' ? 'text-yellow-600' : ''}
                                ${task.priority === 'low' ? 'text-green-600' : ''}
                              `}>
                                {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} Priority
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      {task.assignee && (
                        <div className="flex-shrink-0">
                          <img 
                            className="h-6 w-6 rounded-full"
                            src={task.assignee.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(task.assignee.name)}&background=random`}
                            alt={task.assignee.name}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No recent tasks</p>
              )}
            </div>
          </div>

          {/* Upcoming Deadlines */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Upcoming Deadlines</h2>
            </div>
            <div className="p-6">
              {upcomingTasks.length > 0 ? (
                <div className="space-y-4">
                  {upcomingTasks.map((task) => (
                    <div key={task.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{task.title}</p>
                          <p className="text-xs text-gray-500">
                            Due {new Date(task.due_date!).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      {task.assignee && (
                        <img 
                          className="h-6 w-6 rounded-full"
                          src={task.assignee.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(task.assignee.name)}&background=random`}
                          alt={task.assignee.name}
                        />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No upcoming deadlines</p>
              )}
            </div>
          </div>
        </div>

        {/* Projects Overview */}
        <div className="mt-8 bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Projects</h2>
            <Link 
              href="/projects"
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              View All
            </Link>
          </div>
          <div className="p-6">
            {projects.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.slice(0, 6).map((project) => (
                  <Link
                    key={project.id}
                    href={`/board?project=${project.id}`}
                    className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-center space-x-3 mb-2">
                      <div 
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: project.color }}
                      ></div>
                      <h3 className="font-medium text-gray-900">{project.name}</h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      {project.description || 'No description'}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        project.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {project.status}
                      </span>
                      {project.members && project.members.length > 0 && (
                        <div className="flex items-center space-x-1">
                          <Users className="h-3 w-3 text-gray-400" />
                          <span className="text-xs text-gray-500">{project.members.length}</span>
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FolderOpen className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-sm font-medium text-gray-900 mb-2">No projects yet</h3>
                <p className="text-sm text-gray-500 mb-4">Get started by creating your first project</p>
                <Link
                  href="/projects"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 inline-flex items-center"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Project
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
