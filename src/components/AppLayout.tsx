'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { usePathname, useParams } from 'next/navigation'
import Link from 'next/link'
import { Home, Folder, Menu, ChevronLeft, X, Kanban, Calendar, List, ChevronDown, ChevronRight, Building, LogOut, Settings, Table2, BarChart3 } from 'lucide-react'
import { getUserWorkspaces } from '@/lib/api/users'
import { getProjects } from '@/lib/api/projects'
import Breadcrumb from './Breadcrumb'

interface AppLayoutProps {
  children: React.ReactNode
  actions?: React.ReactNode
}

interface Workspace {
  id: string
  name: string
}

interface Project {
  id: string
  name: string
  color?: string
}

export default function AppLayout({ children, actions }: AppLayoutProps) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const params = useParams()
  const userMenuRef = useRef<HTMLDivElement>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [projectsExpanded, setProjectsExpanded] = useState(true) // Default to expanded when in workspace
  const [workspacesExpanded, setWorkspacesExpanded] = useState(true) // Always expanded for visibility
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(false)
  const [loadingProjects, setLoadingProjects] = useState(false)
  
  // Extract current workspace and project IDs from params
  const currentWorkspaceId = params?.workspaceId as string
  const currentProjectId = params?.projectId as string

  useEffect(() => {
    if (session?.user?.id) {
      loadWorkspaces()
    }
  }, [session])

  useEffect(() => {
    if (currentWorkspaceId && session?.user?.id) {
      loadProjects()
    }
  }, [currentWorkspaceId, session])

  // Click outside handler for user menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
    }

    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [userMenuOpen])

  const loadWorkspaces = async () => {
    if (!session?.user?.id || loadingWorkspaces) return
    
    try {
      setLoadingWorkspaces(true)
      const userWorkspaces = await getUserWorkspaces(session.user.id)
      setWorkspaces(userWorkspaces || [])
    } catch (error) {
      console.error('Error loading workspaces:', error)
    } finally {
      setLoadingWorkspaces(false)
    }
  }

  const loadProjects = async () => {
    if (!currentWorkspaceId || !session?.user?.id || loadingProjects) return
    
    try {
      setLoadingProjects(true)
      const { projects: workspaceProjects } = await getProjects(currentWorkspaceId)
      setProjects(workspaceProjects || [])
    } catch (error) {
      console.error('Error loading projects:', error)
    } finally {
      setLoadingProjects(false)
    }
  }

  // Navigation based on current context - CONSISTENT STRUCTURE
  const navigation: Array<{name: string, href: string, icon: any, current: boolean}> = [
    { name: 'Dashboard', href: '/dashboard', icon: Home, current: pathname === '/dashboard' },
  ]

  // Get current workspace and project names for display
  const currentWorkspace = workspaces.find(w => w.id === currentWorkspaceId)
  const currentProject = projects.find(p => p.id === currentProjectId)

  // Dynamic page title
  const getPageTitle = () => {
    if (currentProject && currentWorkspace) {
      if (pathname?.includes('/board')) return `${currentProject.name} - Board`
      if (pathname?.includes('/list')) return `${currentProject.name} - List`  
      if (pathname?.includes('/gantt')) return `${currentProject.name} - Gantt`
      return `${currentProject.name} - Project`
    }
    if (currentWorkspace) {
      return `${currentWorkspace.name} - Workspace`
    }
    return 'TaskFlow'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex">
      {/* Sidebar */}
      <div className={`fixed left-0 top-0 h-full bg-white/95 backdrop-blur-md border-r border-gray-200/50 transition-all duration-300 z-40 ${sidebarCollapsed ? 'w-16' : 'w-72'}`}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200/50">
            {!sidebarCollapsed && (
              <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                TaskFlow
              </Link>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {sidebarCollapsed ? <Menu className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center space-x-3 px-2 py-1 rounded-lg transition-all text-sm ${
                    item.current
                      ? 'bg-blue-50 text-blue-600 font-medium'
                      : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {!sidebarCollapsed && <span className="font-medium">{item.name}</span>}
                </Link>
              )
            })}

            {/* Workspaces Section - ALWAYS VISIBLE */}
            <div>
              {/* Workspaces Header */}
              <div className="flex items-center justify-between px-2 py-1 rounded-lg transition-all text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50">
                <div className="flex items-center space-x-3 flex-1">
                  <Building className="w-5 h-5" />
                  {!sidebarCollapsed && <span className="font-medium">Workspaces</span>}
                </div>
                {!sidebarCollapsed && (
                  <button
                    onClick={() => setWorkspacesExpanded(!workspacesExpanded)}
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                  >
                    <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${
                      workspacesExpanded ? 'rotate-90' : 'rotate-0'
                    }`} />
                  </button>
                )}
              </div>

              {/* Workspaces List */}
              {!sidebarCollapsed && (
                <div className={`overflow-hidden transition-all duration-300 ${
                  workspacesExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                }`}>
                  <div className="ml-6 mt-2 space-y-1">
                    {loadingWorkspaces ? (
                      <div className="px-2 py-1 text-sm text-gray-500">Loading workspaces...</div>
                    ) : workspaces.length > 0 ? (
                      workspaces.map((workspace) => (
                        <div key={workspace.id}>
                          {/* Workspace Link */}
                          <Link
                            href={`/workspace/${workspace.id}`}
                            className={`flex items-center space-x-3 px-2 py-1 rounded-lg text-sm transition-all ${
                              workspace.id === currentWorkspaceId 
                                ? 'bg-blue-50 text-blue-600 font-medium'
                                : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                            }`}
                          >
                            <Building className="w-3 h-3" />
                            <span className="truncate">{workspace.name}</span>
                          </Link>

                          {/* Projects under this workspace - only show if it's the current workspace */}
                          {workspace.id === currentWorkspaceId && (
                            <div className="ml-4 mt-1 space-y-1">
                              {/* Projects Header */}
                              <div className="flex items-center justify-between px-2 py-1 text-xs text-gray-500">
                                <span>Projects</span>
                                <button
                                  onClick={() => setProjectsExpanded(!projectsExpanded)}
                                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                                >
                                  <ChevronRight className={`w-3 h-3 transition-transform duration-200 ${
                                    projectsExpanded ? 'rotate-90' : 'rotate-0'
                                  }`} />
                                </button>
                              </div>

                              {/* Projects List */}
                              <div className={`overflow-hidden transition-all duration-300 ${
                                projectsExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                              }`}>
                                <div className="ml-2 space-y-1">
                                  {loadingProjects ? (
                                    <div className="px-2 py-1 text-xs text-gray-500">Loading...</div>
                                  ) : projects.length > 0 ? (
                                    projects.map((project) => (
                                      <div key={project.id}>
                                        {/* Project Link */}
                                        <Link
                                          href={`/workspace/${workspace.id}/project/${project.id}`}
                                          className={`flex items-center space-x-3 px-2 py-1 rounded-lg text-xs transition-all ${
                                            project.id === currentProjectId 
                                              ? 'bg-blue-50 text-blue-600 font-medium'
                                              : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                                          }`}
                                        >
                                          <div 
                                            className="w-2 h-2 rounded-full"
                                            style={{ backgroundColor: project.color || '#6b7280' }}
                                          />
                                          <span className="truncate">{project.name}</span>
                                        </Link>
                                        
                                        {/* Project Views - only show for current project */}
                                        {project.id === currentProjectId && (
                                          <div className="ml-6 mt-1 space-y-1">
                                            <Link
                                              href={`/workspace/${workspace.id}/project/${project.id}/board`}
                                              className={`flex items-center space-x-2 px-2 py-1 rounded text-xs transition-all ${
                                                pathname?.includes('/board')
                                                  ? 'bg-blue-50 text-blue-600 font-medium'
                                                  : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'
                                              }`}
                                            >
                                              <Kanban className="w-3 h-3" />
                                              <span>Board</span>
                                            </Link>
                                            <Link
                                              href={`/workspace/${workspace.id}/project/${project.id}/list`}
                                              className={`flex items-center space-x-2 px-2 py-1 rounded text-xs transition-all ${
                                                pathname?.includes('/list')
                                                  ? 'bg-blue-50 text-blue-600 font-medium'
                                                  : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'
                                              }`}
                                            >
                                              <List className="w-3 h-3" />
                                              <span>List</span>
                                            </Link>
                                            <Link
                                              href={`/workspace/${workspace.id}/project/${project.id}/calendar`}
                                              className={`flex items-center space-x-2 px-2 py-1 rounded text-xs transition-all ${
                                                pathname?.includes('/calendar')
                                                  ? 'bg-blue-50 text-blue-600 font-medium'
                                                  : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'
                                              }`}
                                            >
                                              <Calendar className="w-3 h-3" />
                                              <span>Calendar</span>
                                            </Link>
                                            <Link
                                              href={`/workspace/${workspace.id}/project/${project.id}/table`}
                                              className={`flex items-center space-x-2 px-2 py-1 rounded text-xs transition-all ${
                                                pathname?.includes('/table')
                                                  ? 'bg-blue-50 text-blue-600 font-medium'
                                                  : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'
                                              }`}
                                            >
                                              <Table2 className="w-3 h-3" />
                                              <span>Table</span>
                                            </Link>
                                            <Link
                                              href={`/workspace/${workspace.id}/project/${project.id}/gantt`}
                                              className={`flex items-center space-x-2 px-2 py-1 rounded text-xs transition-all ${
                                                pathname?.includes('/gantt')
                                                  ? 'bg-blue-50 text-blue-600 font-medium'
                                                  : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'
                                              }`}
                                            >
                                              <BarChart3 className="w-3 h-3" />
                                              <span>Gantt</span>
                                            </Link>
                                          </div>
                                        )}
                                      </div>
                                    ))
                                  ) : (
                                    <div className="px-2 py-1 text-xs text-gray-500">No projects</div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="px-2 py-1 text-sm text-gray-500">No workspaces found</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </nav>

          {/* User Info */}
          {!sidebarCollapsed && (
            <div className="p-4 border-t border-gray-200/50">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  {session?.user?.name?.[0] || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {session?.user?.name}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {session?.user?.email}
                  </div>
                </div>
                <button
                  onClick={() => signOut()}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-72'}`}>
        {/* Fixed Header */}
        <header className="fixed top-0 right-0 left-0 z-30 bg-blue-900/95 backdrop-blur-md border-b border-blue-800/50" style={{ marginLeft: sidebarCollapsed ? '64px' : '288px' }}>
          <div className="px-6 py-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h1 className="text-lg font-semibold text-white">
                  {getPageTitle()}
                </h1>
              </div>
              <div className="flex items-center space-x-3">
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center space-x-2 hover:bg-blue-800/50 rounded-lg p-2 transition-colors"
                  >
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                      {session?.user?.name?.[0] || 'U'}
                    </div>
                    <div className="hidden sm:block text-left">
                      <div className="text-sm font-medium text-white">
                        {session?.user?.name}
                      </div>
                    </div>
                    <ChevronDown className="w-4 h-4 text-white/70" />
                  </button>
                  
                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <div className="text-sm font-medium text-gray-900">{session?.user?.name}</div>
                        <div className="text-xs text-gray-500">{session?.user?.email}</div>
                      </div>
                      <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2">
                        <Settings className="w-4 h-4" />
                        <span>Settings</span>
                      </button>
                      <button 
                        onClick={() => signOut()}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Breadcrumb Sub Header */}
        <div className="fixed right-0 left-0 z-25 bg-white/95 backdrop-blur-md border-b border-gray-200/50" style={{ marginLeft: sidebarCollapsed ? '64px' : '288px', top: '52px' }}>
          <Breadcrumb />
        </div>

        {/* Views/Actions Sub Header */}
        {actions && (
          <div className="fixed right-0 left-0 z-20 bg-gray-50/95 backdrop-blur-md border-b border-gray-200/30" style={{ marginLeft: sidebarCollapsed ? '64px' : '288px', top: '96px' }}>
            <div className="px-6 py-1">
              <div className="flex items-center space-x-3">
                {actions}
              </div>
            </div>
          </div>
        )}
        
        {/* Content with proper padding for all headers */}
        <div className={`min-h-screen ${actions ? 'pt-36' : 'pt-28'}`}>
          {children}
        </div>
      </div>
    </div>
  )
}