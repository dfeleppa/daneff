'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import AppLayout from '@/components/AppLayout'
import { Gantt, Task as GanttTask, ViewMode } from 'gantt-task-react'
import { format, addDays, startOfDay, endOfDay, isValid, parseISO } from 'date-fns'
import { Calendar, ArrowLeft, ZoomIn, ZoomOut, BarChart3 } from 'lucide-react'
import { getUserWorkspaces } from '@/lib/api/users'
import { getProjects, getProjectTasks } from '@/lib/api/projects'
import 'gantt-task-react/dist/index.css'

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

function GanttPageContent() {
  const { data: session, status } = useSession()
  const searchParams = useSearchParams()
  const projectId = searchParams?.get('project')

  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [ganttTasks, setGanttTasks] = useState<GanttTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Day)

  useEffect(() => {
    if (session?.user?.id) {
      loadGanttData()
    }
  }, [session, projectId])

  useEffect(() => {
    if (tasks.length > 0) {
      convertTasksToGanttFormat()
    }
  }, [tasks])

  const loadGanttData = async () => {
    if (!session?.user?.id) return

    try {
      setLoading(true)
      setError(null)

      // Get user's workspaces
      const userWorkspaces = await getUserWorkspaces(session.user.id)
      
      if (userWorkspaces.length === 0) {
        setError('No workspace found. Please create a workspace first.')
        return
      }

      // Get projects from the first workspace
      const { projects: workspaceProjects } = await getProjects(userWorkspaces[0].id)
      setProjects(workspaceProjects)

      if (workspaceProjects.length === 0) {
        setError('No projects found. Please create a project first.')
        return
      }

      // Set selected project
      let currentProject = workspaceProjects.find(p => p.id === projectId) || workspaceProjects[0]
      setSelectedProject(currentProject)

      if (currentProject) {
        console.log('Loading Gantt data for project:', currentProject.name, currentProject.id)
        
        // Get tasks for the project
        const { tasks: projectTasks, error: tasksError } = await getProjectTasks(currentProject.id)
        if (tasksError) {
          setError(`Failed to load tasks: ${tasksError.message}`)
          return
        }
        setTasks(projectTasks)
        
        console.log('Gantt data loaded successfully:', {
          project: currentProject.name,
          tasks: projectTasks.length
        })
      }
    } catch (error: any) {
      console.error('Error loading Gantt data:', error)
      setError(`Failed to load Gantt chart: ${error.message || 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const convertTasksToGanttFormat = () => {
    const today = new Date()
    
    const ganttData: GanttTask[] = tasks
      .filter(task => task.due_date) // Only include tasks with due dates
      .map((task, index) => {
        let startDate = startOfDay(parseISO(task.created_at))
        let endDate: Date

        if (task.due_date && isValid(parseISO(task.due_date))) {
          endDate = endOfDay(parseISO(task.due_date))
        } else {
          // If no due date, make it a 1-day task starting from creation
          endDate = endOfDay(addDays(startDate, 1))
        }

        // Ensure end date is after start date
        if (endDate <= startDate) {
          endDate = endOfDay(addDays(startDate, 1))
        }

        // Get progress based on status
        let progress = 0
        if (task.status?.name.toLowerCase().includes('progress')) {
          progress = 50
        } else if (task.status?.name.toLowerCase().includes('review')) {
          progress = 75
        } else if (task.status?.name.toLowerCase().includes('done') || task.status?.name.toLowerCase().includes('complete')) {
          progress = 100
        }

        return {
          id: task.id,
          name: task.title,
          start: startDate,
          end: endDate,
          progress,
          type: 'task' as const,
          displayOrder: index + 1,
          styles: {
            backgroundColor: task.priority === 'urgent' ? '#dc2626' :
                           task.priority === 'high' ? '#ea580c' :
                           task.priority === 'medium' ? '#ca8a04' :
                           '#6b7280',
            backgroundSelectedColor: task.priority === 'urgent' ? '#b91c1c' :
                                   task.priority === 'high' ? '#c2410c' :
                                   task.priority === 'medium' ? '#a16207' :
                                   '#4b5563',
            progressColor: '#10b981',
            progressSelectedColor: '#059669'
          }
        }
      })

    setGanttTasks(ganttData)
  }

  const handleTaskChange = (task: GanttTask) => {
    console.log('Task changed:', task)
    // Here you could implement updating the task dates in the database
    setGanttTasks(prev => prev.map(t => t.id === task.id ? task : t))
  }

  const handleTaskDelete = (task: GanttTask) => {
    console.log('Task delete requested:', task)
    // Here you could implement task deletion
  }

  const getViewModeLabel = (mode: ViewMode) => {
    switch (mode) {
      case ViewMode.Hour: return 'Hours'
      case ViewMode.QuarterDay: return '6 Hours'
      case ViewMode.HalfDay: return '12 Hours'
      case ViewMode.Day: return 'Days'
      case ViewMode.Week: return 'Weeks'
      case ViewMode.Month: return 'Months'
      case ViewMode.Year: return 'Years'
      default: return 'Days'
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

  if (!selectedProject) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">No Project Selected</h1>
          <p className="text-gray-600 mb-4">Please select a project to view its Gantt chart.</p>
          <Link
            href="/projects"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Go to Projects
          </Link>
        </div>
      </div>
    )
  }

  const ganttActions = (
    <select 
      value={selectedProject?.id || ''}
      onChange={(e) => {
        const project = projects.find(p => p.id === e.target.value)
        setSelectedProject(project || null)
      }}
      className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
    >
      <option value="">Select Project</option>
      {projects.map(project => (
        <option key={project.id} value={project.id}>{project.name}</option>
      ))}
    </select>
  )

  return (
    <AppLayout actions={ganttActions}>
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          {/* Gantt Content */}
          <main className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Messages */}
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
        
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href="/projects"
              className="text-gray-500 hover:text-gray-700 flex items-center"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Projects
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1 flex items-center">
                <BarChart3 className="w-6 h-6 mr-2" />
                {selectedProject.name} - Timeline
              </h1>
              <p className="text-gray-600">{selectedProject.description || 'Project timeline view'}</p>
            </div>
          </div>

          {/* View Controls */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">View:</span>
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as ViewMode)}
              className="border border-gray-300 rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={ViewMode.Day}>Days</option>
              <option value={ViewMode.Week}>Weeks</option>
              <option value={ViewMode.Month}>Months</option>
            </select>
          </div>
        </div>

        {ganttTasks.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks with due dates</h3>
            <p className="text-gray-600 mb-4">
              Add due dates to your tasks to see them in the Gantt chart timeline.
            </p>
            <Link
              href={`/board?project=${selectedProject.id}`}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Go to Board
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">
                  Project Timeline ({ganttTasks.length} tasks)
                </h3>
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-red-600 rounded mr-1"></div>
                    Urgent
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-orange-600 rounded mr-1"></div>
                    High
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-yellow-600 rounded mr-1"></div>
                    Medium
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-gray-500 rounded mr-1"></div>
                    Low
                  </div>
                </div>
              </div>
            </div>
            <div className="gantt-container" style={{ height: '500px', overflow: 'auto' }}>
              <Gantt
                tasks={ganttTasks}
                viewMode={viewMode}
                onDateChange={handleTaskChange}
                onDelete={handleTaskDelete}
                columnWidth={viewMode === ViewMode.Month ? 300 : viewMode === ViewMode.Week ? 100 : 50}
                listCellWidth="200px"
                rowHeight={50}
                barBackgroundColor="#3b82f6"
                barBackgroundSelectedColor="#1d4ed8"
              />
            </div>
          </div>
        )}
          </main>
        </div>
      </div>
    </AppLayout>
  )
}

export default function GanttPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    }>
      <GanttPageContent />
    </Suspense>
  )
}