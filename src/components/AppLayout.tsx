'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Home, Folder, Menu, ChevronLeft, X, Kanban, Calendar, ChevronDown, ChevronRight } from 'lucide-react'
import { getUserWorkspaces } from '@/lib/api/users'
import { getProjects } from '@/lib/api/projects'

interface AppLayoutProps {
  children: React.ReactNode
  actions?: React.ReactNode
}

interface Project {
  id: string
  name: string
  color?: string
}

export default function AppLayout({ children, actions }: AppLayoutProps) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [projectsExpanded, setProjectsExpanded] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [loadingProjects, setLoadingProjects] = useState(false)

  useEffect(() => {
    if (session?.user?.id) {
      loadProjects()
    }
  }, [session])

  const loadProjects = async () => {
    if (!session?.user?.id || loadingProjects) return
    
    try {
      setLoadingProjects(true)
      const userWorkspaces = await getUserWorkspaces(session.user.id)
      
      if (userWorkspaces.length > 0) {
        const { projects: workspaceProjects } = await getProjects(userWorkspaces[0].id)
        setProjects(workspaceProjects || [])
      }
    } catch (error) {
      console.error('Error loading projects:', error)
    } finally {
      setLoadingProjects(false)
    }
  }

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home, current: pathname === '/' },
    { name: 'Board', href: '/board', icon: Kanban, current: pathname === '/board' || pathname?.startsWith('/board?') },
    { name: 'Gantt', href: '/gantt', icon: Calendar, current: pathname === '/gantt' || pathname?.startsWith('/gantt?') },
  ]

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
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-all ${
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

            {/* Projects Section */}
            <div>
              {/* Projects Header */}
              <div className={`flex items-center justify-between px-3 py-2 rounded-lg transition-all ${
                pathname === '/projects' 
                  ? 'bg-blue-50 text-blue-600 font-medium' 
                  : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
              }`}>
                <Link 
                  href="/projects" 
                  className="flex items-center space-x-3 flex-1"
                >
                  <Folder className="w-5 h-5" />
                  {!sidebarCollapsed && <span className="font-medium">Projects</span>}
                </Link>
                {!sidebarCollapsed && (
                  <button
                    onClick={() => setProjectsExpanded(!projectsExpanded)}
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                  >
                    <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${
                      projectsExpanded ? 'rotate-90' : 'rotate-0'
                    }`} />
                  </button>
                )}
              </div>

              {/* Projects List */}
              {!sidebarCollapsed && (
                <div className={`overflow-hidden transition-all duration-300 ${
                  projectsExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                }`}>
                  <div className="ml-6 mt-2 space-y-1">
                    {loadingProjects ? (
                      <div className="px-3 py-2 text-sm text-gray-500">Loading projects...</div>
                    ) : projects.length > 0 ? (
                      projects.map((project) => (
                        <Link
                          key={project.id}
                          href={`/board?project=${project.id}`}
                          className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-all text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                        >
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: project.color || '#6b7280' }}
                          />
                          <span className="truncate">{project.name}</span>
                        </Link>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-sm text-gray-500">No projects found</div>
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
        <header className="fixed top-0 right-0 left-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-200/50" style={{ marginLeft: sidebarCollapsed ? '64px' : '288px' }}>
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h1 className="text-lg font-semibold text-gray-900">
                  {pathname === '/' ? 'Dashboard' :
                   pathname === '/projects' ? 'Projects' :
                   pathname === '/board' || pathname?.startsWith('/board') ? 'Kanban Board' :
                   pathname === '/gantt' || pathname?.startsWith('/gantt') ? 'Gantt Chart' :
                   'TaskFlow'}
                </h1>
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                    {session?.user?.name?.[0] || 'U'}
                  </div>
                  <div className="hidden sm:block">
                    <div className="text-sm font-medium text-gray-900">
                      {session?.user?.name}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Sub Header for Actions */}
        {actions && (
          <div className="fixed top-16 right-0 left-0 z-20 bg-gray-50/95 backdrop-blur-md border-b border-gray-200/30" style={{ marginLeft: sidebarCollapsed ? '64px' : '288px' }}>
            <div className="px-6 py-3">
              <div className="flex items-center justify-end space-x-3">
                {actions}
              </div>
            </div>
          </div>
        )}
        
        {/* Content with proper padding for both headers */}
        <div className={`min-h-screen ${actions ? 'pt-32' : 'pt-20'}`}>
          {children}
        </div>
      </div>
    </div>
  )
}