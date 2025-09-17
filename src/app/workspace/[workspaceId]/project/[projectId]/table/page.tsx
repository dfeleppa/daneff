'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { useParams, useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { ArrowUpDown, ArrowUp, ArrowDown, Calendar, Clock, Users, Filter, Search } from 'lucide-react'
import { getUserWorkspaces } from '@/lib/api/users'
import { getProjects, getProjectTasks } from '@/lib/api/projects'
import AppLayout from '@/components/AppLayout'
import ViewsTabBar from '@/components/ViewsTabBar'

interface Task {
  id: string
  title: string
  description: string | null
  status_id: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  due_date: string | null
  created_at: string
  assignee?: {
    id: string
    name: string
    avatar_url: string | null
  }
  status?: {
    id: string
    name: string
    color: string
    order_index: number
  }
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
}

type SortField = 'title' | 'priority' | 'status' | 'due_date' | 'created_at' | 'assignee'
type SortDirection = 'asc' | 'desc'

function TablePageContent() {
  const { data: session, status } = useSession()
  const params = useParams()
  const router = useRouter()
  const pathname = usePathname()
  
  const workspaceId = params.workspaceId as string
  const projectId = params.projectId as string

  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')

  // Redirect to new nested route structure - ONLY if on old route
  useEffect(() => {
    const redirectToNestedRoute = async () => {
      if (session?.user?.id && pathname === '/table') {
        try {
          const userWorkspaces = await getUserWorkspaces(session.user.id)
          
          if (userWorkspaces.length > 0) {
            const workspaceId = userWorkspaces[0].id
            const { projects: workspaceProjects } = await getProjects(workspaceId)
            
            if (workspaceProjects.length > 0) {
              const currentProject = workspaceProjects.find(p => p.id === projectId) || workspaceProjects[0]
              router.replace(`/workspace/${workspaceId}/project/${currentProject.id}/table`)
            }
          }
        } catch (error) {
          console.error('Error during redirect:', error)
        }
      }
    }

    redirectToNestedRoute()
  }, [session?.user?.id, pathname, projectId, router])

  useEffect(() => {
    const fetchData = async () => {
      if (!session?.user?.id || !workspaceId || !projectId) return

      try {
        setLoading(true)
        
        // Fetch projects to get current project info
        const { projects } = await getProjects(workspaceId)
        const currentProject = projects.find(p => p.id === projectId)
        
        if (!currentProject) {
          setError('Project not found')
          return
        }
        
        setProjects(projects)
        setSelectedProject(currentProject)

        // Fetch project tasks
        const result = await getProjectTasks(projectId)
        if (result.error) {
          setError(result.error)
        } else {
          setTasks(result.tasks)
        }
        
      } catch (err) {
        console.error('Error fetching table data:', err)
        setError('Failed to load table data')
      } finally {
        setLoading(false)
      }
    }

    if (session?.user?.id) {
      fetchData()
    }
  }, [session?.user?.id, workspaceId, projectId])

  // Sorting and filtering functions
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const getSortedTasks = () => {
    let filtered = [...tasks]

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(task => task.status?.name === statusFilter)
    }

    // Apply priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(task => task.priority === priorityFilter)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortField) {
        case 'title':
          aValue = a.title.toLowerCase()
          bValue = b.title.toLowerCase()
          break
        case 'priority':
          const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 }
          aValue = priorityOrder[a.priority] || 0
          bValue = priorityOrder[b.priority] || 0
          break
        case 'status':
          aValue = a.status?.name || ''
          bValue = b.status?.name || ''
          break
        case 'due_date':
          aValue = a.due_date ? new Date(a.due_date).getTime() : 0
          bValue = b.due_date ? new Date(b.due_date).getTime() : 0
          break
        case 'created_at':
          aValue = new Date(a.created_at).getTime()
          bValue = new Date(b.created_at).getTime()
          break
        case 'assignee':
          aValue = a.assignee?.name || ''
          bValue = b.assignee?.name || ''
          break
        default:
          return 0
      }

      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
      }
    })

    return filtered
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const SortIcon = ({ field, currentField, direction }: { field: SortField, currentField: SortField, direction: SortDirection }) => {
    if (field !== currentField) {
      return <ArrowUpDown className="w-4 h-4 text-gray-400" />
    }
    return direction === 'asc' ? (
      <ArrowUp className="w-4 h-4 text-blue-600" />
    ) : (
      <ArrowDown className="w-4 h-4 text-blue-600" />
    )
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading table...</p>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return <div className="flex items-center justify-center min-h-screen">Please sign in to view table.</div>
  }

  if (error) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Link
              href={`/workspace/${workspaceId}/projects`}
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Back to Projects
            </Link>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (!selectedProject) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <p className="text-gray-600 mb-4">Project not found</p>
            <Link
              href={`/workspace/${workspaceId}/projects`}
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Back to Projects
            </Link>
          </div>
        </div>
      </AppLayout>
    )
  }

  const sortedTasks = getSortedTasks()
  const uniqueStatuses = Array.from(new Set(tasks.map(task => task.status?.name).filter(Boolean)))

  const tableActions = (
    <ViewsTabBar 
      workspaceId={workspaceId} 
      projectId={projectId}
    />
  )

  return (
    <AppLayout actions={tableActions}>
      <main className="w-full px-6 py-8">
        {/* Table Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Tasks Table</h2>
              <p className="text-gray-600 mt-1">{tasks.length} total tasks</p>
            </div>
            
            {/* Filters and Search */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  id="table-search-tasks"
                  name="search"
                  type="text"
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <select
                id="table-status-filter"
                name="statusFilter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Statuses</option>
                {uniqueStatuses.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
              
              <select
                id="table-priority-filter"
                name="priorityFilter"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('title')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Task</span>
                      <SortIcon field="title" currentField={sortField} direction={sortDirection} />
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Status</span>
                      <SortIcon field="status" currentField={sortField} direction={sortDirection} />
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('priority')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Priority</span>
                      <SortIcon field="priority" currentField={sortField} direction={sortDirection} />
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('assignee')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Assignee</span>
                      <SortIcon field="assignee" currentField={sortField} direction={sortDirection} />
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('due_date')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Due Date</span>
                      <SortIcon field="due_date" currentField={sortField} direction={sortDirection} />
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('created_at')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Created</span>
                      <SortIcon field="created_at" currentField={sortField} direction={sortDirection} />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedTasks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all' 
                        ? 'No tasks match your filters' 
                        : 'No tasks found'
                      }
                    </td>
                  </tr>
                ) : (
                  sortedTasks.map((task) => (
                    <tr key={task.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{task.title}</div>
                          {task.description && (
                            <div className="text-sm text-gray-500 mt-1 line-clamp-2">{task.description}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {task.status ? (
                          <span 
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                            style={{
                              backgroundColor: task.status.color + '20',
                              color: task.status.color,
                              border: `1px solid ${task.status.color}40`
                            }}
                          >
                            {task.status.name}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {task.assignee ? (
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium">
                              {task.assignee.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm text-gray-900">{task.assignee.name}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">Unassigned</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {task.due_date && (
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span>{formatDate(task.due_date)}</span>
                          </div>
                        )}
                        {!task.due_date && <span className="text-gray-400">-</span>}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span>{formatDate(task.created_at)}</span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Table Summary */}
        {sortedTasks.length > 0 && (
          <div className="mt-4 text-sm text-gray-500 text-center">
            Showing {sortedTasks.length} of {tasks.length} tasks
          </div>
        )}
      </main>
    </AppLayout>
  )
}

export default function TablePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    }>
      <TablePageContent />
    </Suspense>
  )
}