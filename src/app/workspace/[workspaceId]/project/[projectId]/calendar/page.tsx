'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { useParams, useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Clock, Users } from 'lucide-react'
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

function CalendarPageContent() {
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
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  // Redirect to new nested route structure - ONLY if on old route
  useEffect(() => {
    const redirectToNestedRoute = async () => {
      if (session?.user?.id && pathname === '/calendar') {
        try {
          const userWorkspaces = await getUserWorkspaces(session.user.id)
          
          if (userWorkspaces.length > 0) {
            const workspaceId = userWorkspaces[0].id
            const { projects: workspaceProjects } = await getProjects(workspaceId)
            
            if (workspaceProjects.length > 0) {
              const currentProject = workspaceProjects.find(p => p.id === projectId) || workspaceProjects[0]
              router.replace(`/workspace/${workspaceId}/project/${currentProject.id}/calendar`)
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
        console.error('Error fetching calendar data:', err)
        setError('Failed to load calendar data')
      } finally {
        setLoading(false)
      }
    }

    if (session?.user?.id) {
      fetchData()
    }
  }, [session?.user?.id, workspaceId, projectId])

  // Calendar helper functions
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0]
  }

  const isSameDate = (date1: Date, date2: Date) => {
    return date1.toDateString() === date2.toDateString()
  }

  const getTasksForDate = (date: Date) => {
    const dateStr = formatDate(date)
    return tasks.filter(task => task.due_date === dateStr)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500'
      case 'high': return 'bg-orange-500'
      case 'medium': return 'bg-yellow-500'
      case 'low': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading calendar...</p>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return <div className="flex items-center justify-center min-h-screen">Please sign in to view calendar.</div>
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

  // Generate calendar grid
  const daysInMonth = getDaysInMonth(currentDate)
  const firstDay = getFirstDayOfMonth(currentDate)
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  
  // Create calendar grid with empty cells for previous month
  const calendarDays = []
  
  // Empty cells for previous month
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null)
  }
  
  // Days of current month
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
    calendarDays.push(date)
  }

  const calendarActions = (
    <ViewsTabBar 
      workspaceId={workspaceId} 
      projectId={projectId}
    />
  )

  return (
    <AppLayout actions={calendarActions}>
      <main className="w-full px-6 py-8">
        {/* Calendar Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">{monthName}</h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={goToToday}
                className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
              >
                Today
              </button>
              <button
                onClick={goToPreviousMonth}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={goToNextMonth}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Day Names Header */}
          <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
            {dayNames.map((dayName) => (
              <div key={dayName} className="p-4 text-center text-sm font-medium text-gray-700">
                {dayName}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7">
            {calendarDays.map((date, index) => {
              if (!date) {
                return <div key={index} className="h-40 bg-gray-50 border-b border-r border-gray-100"></div>
              }

              const dayTasks = getTasksForDate(date)
              const isToday = isSameDate(date, new Date())
              const isSelected = selectedDate && isSameDate(date, selectedDate)

              return (
                <div
                  key={index}
                  className={`h-40 border-b border-r border-gray-100 p-2 cursor-pointer hover:bg-gray-50 transition-colors ${
                    isToday ? 'bg-blue-50' : ''
                  } ${isSelected ? 'bg-blue-100' : ''}`}
                  onClick={() => setSelectedDate(date)}
                >
                  <div className={`text-sm font-medium mb-1 ${
                    isToday ? 'text-blue-600' : 'text-gray-900'
                  }`}>
                    {date.getDate()}
                  </div>
                  
                  <div className="space-y-1">
                    {dayTasks.slice(0, 4).map((task) => (
                      <div
                        key={task.id}
                        className={`text-xs p-1 rounded text-white truncate ${getPriorityColor(task.priority)}`}
                        title={task.title}
                      >
                        {task.title}
                      </div>
                    ))}
                    {dayTasks.length > 4 && (
                      <div className="text-xs text-gray-500">
                        +{dayTasks.length - 4} more
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Selected Date Tasks */}
        {selectedDate && (
          <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Tasks for {selectedDate.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </h3>
              <button
                onClick={() => setSelectedDate(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-3">
              {getTasksForDate(selectedDate).length === 0 ? (
                <p className="text-gray-500">No tasks scheduled for this date</p>
              ) : (
                getTasksForDate(selectedDate).map((task) => (
                  <div key={task.id} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
                    <div className={`w-3 h-3 rounded-full ${getPriorityColor(task.priority)}`}></div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{task.title}</h4>
                      {task.description && (
                        <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                      )}
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        <span className="capitalize">{task.priority} priority</span>
                        {task.status && (
                          <span className="px-2 py-1 rounded-full" style={{
                            backgroundColor: task.status.color + '20',
                            color: task.status.color
                          }}>
                            {task.status.name}
                          </span>
                        )}
                        {task.assignee && (
                          <div className="flex items-center space-x-1">
                            <Users className="w-3 h-3" />
                            <span>{task.assignee.name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>
    </AppLayout>
  )
}

export default function CalendarPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    }>
      <CalendarPageContent />
    </Suspense>
  )
}