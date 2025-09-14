'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Calendar, MoreHorizontal, Plus, ArrowLeft, Trash2, Check, X, Edit3, ChevronDown, ChevronRight } from 'lucide-react'
import { getUserWorkspaces } from '@/lib/api/users'
import { getProjects, getProjectTasks, getTaskStatuses, updateTask, createTask, deleteTask, markTaskComplete, markTaskIncomplete, createSubTask } from '@/lib/api/projects'
import AppLayout from '@/components/AppLayout'

interface Task {
  id: string
  title: string
  description: string | null
  status_id: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  due_date: string | null
  created_at: string
  parent_task_id?: string | null
  completion_percentage?: number
  assignee?: {
    id: string
    name: string
    avatar_url: string | null
  }
  creator?: {
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
  sub_tasks?: Task[]
}

interface TaskStatus {
  id: string
  name: string
  color: string
  order_index: number
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

function ListPageContent() {
  const { data: session, status } = useSession()
  const searchParams = useSearchParams()
  const projectId = searchParams.get('project')

  const [tasks, setTasks] = useState<Task[]>([])
  const [statuses, setStatuses] = useState<TaskStatus[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())

  // Load data
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      loadData()
    }
  }, [status, session, projectId])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Get user's workspaces and projects
      const workspaces = await getUserWorkspaces(session!.user.id)
      if (!workspaces || workspaces.length === 0) {
        throw new Error('No workspaces found')
      }

      const allProjects: Project[] = []
      for (const workspace of workspaces) {
        const result = await getProjects(workspace.id)
        if (result.projects) {
          allProjects.push(...result.projects)
        }
      }

      setProjects(allProjects)

      // Select project
      let project = null
      if (projectId) {
        project = allProjects.find(p => p.id === projectId)
      }
      if (!project && allProjects.length > 0) {
        project = allProjects[0]
      }

      if (!project) {
        throw new Error('No projects found')
      }

      setSelectedProject(project)

      // Load tasks and statuses for the selected project
      const [projectTasksResult, taskStatusesResult] = await Promise.all([
        getProjectTasks(project.id),
        getTaskStatuses(project.id)
      ])

      setTasks(projectTasksResult?.tasks || [])
      setStatuses(taskStatusesResult?.statuses || [])
    } catch (error) {
      console.error('Error loading data:', error)
      setError(error instanceof Error ? error.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleCompleteTask = async (task: Task) => {
    if (!selectedProject) return
    
    try {
      await markTaskComplete(task.id, selectedProject.id)
      setSuccess('Task marked as complete')
      loadData()
      setTimeout(() => setSuccess(null), 3000)
    } catch (error) {
      console.error('Error completing task:', error)
      setError('Failed to complete task')
      setTimeout(() => setError(null), 3000)
    }
  }

  const handleUncompleteTask = async (task: Task) => {
    if (!selectedProject) return
    
    try {
      await markTaskIncomplete(task.id, selectedProject.id)
      setSuccess('Task marked as incomplete')
      loadData()
      setTimeout(() => setSuccess(null), 3000)
    } catch (error) {
      console.error('Error uncompleting task:', error)
      setError('Failed to uncomplete task')
      setTimeout(() => setError(null), 3000)
    }
  }

  const handleDeleteTask = async (task: Task) => {
    if (!confirm('Are you sure you want to delete this task?')) return
    
    try {
      await deleteTask(task.id)
      setSuccess('Task deleted successfully')
      loadData()
      setTimeout(() => setSuccess(null), 3000)
    } catch (error) {
      console.error('Error deleting task:', error)
      setError('Failed to delete task')
      setTimeout(() => setError(null), 3000)
    }
  }

  const toggleSectionCollapse = (statusId: string) => {
    const newCollapsed = new Set(collapsedSections)
    if (newCollapsed.has(statusId)) {
      newCollapsed.delete(statusId)
    } else {
      newCollapsed.add(statusId)
    }
    setCollapsedSections(newCollapsed)
  }

  // Group tasks by status
  const tasksByStatus = statuses.map(status => {
    const statusTasks = tasks.filter(task => task.status_id === status.id)
    return {
      status,
      tasks: statusTasks.sort((a, b) => {
        // Parent tasks first, then sub-tasks
        if (a.parent_task_id && !b.parent_task_id) return 1
        if (!a.parent_task_id && b.parent_task_id) return -1
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      })
    }
  }).filter(group => group.tasks.length > 0)

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusColor = (status: TaskStatus) => {
    const isComplete = status.name.toLowerCase().includes('done') || 
                      status.name.toLowerCase().includes('complete')
    const isInProgress = status.name.toLowerCase().includes('progress') ||
                        status.name.toLowerCase().includes('doing')
    
    if (isComplete) return 'bg-green-100 text-green-800 border-green-200'
    if (isInProgress) return 'bg-blue-100 text-blue-800 border-blue-200'
    return 'bg-gray-100 text-gray-800 border-gray-200'
  }

  if (status === 'loading') {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (status === 'unauthenticated') {
    return <div className="flex items-center justify-center min-h-screen">Please sign in to view tasks.</div>
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading tasks...</p>
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
            <p className="text-gray-600 mb-4">No project selected</p>
            <Link
              href="/"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Go to Workspaces
            </Link>
          </div>
        </div>
      </AppLayout>
    )
  }

  const actions = (
    <div className="flex items-center space-x-6">
      <div className="flex items-center space-x-3">
        <Link
          href={`/board?project=${selectedProject.id}`}
          className="px-4 py-2 text-gray-600 hover:text-blue-600 font-medium transition-colors"
        >
          Board
        </Link>
        <span className="px-4 py-2 text-blue-600 font-medium border-b-2 border-blue-600">
          List
        </span>
        <Link
          href={`/gantt?project=${selectedProject.id}`}
          className="px-4 py-2 text-gray-600 hover:text-blue-600 font-medium transition-colors"
        >
          Gantt
        </Link>
      </div>
      <select 
        value={selectedProject.id}
        onChange={(e) => {
          const project = projects.find(p => p.id === e.target.value)
          if (project) {
            window.location.href = `/list?project=${project.id}`
          }
        }}
        className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all duration-200 shadow-sm"
      >
        {projects.map(project => (
          <option key={project.id} value={project.id}>{project.name}</option>
        ))}
      </select>
    </div>
  )

  return (
    <AppLayout actions={actions}>
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <X className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-red-800 font-medium">{error}</p>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <Check className="h-5 w-5 text-green-400" />
            </div>
            <div className="ml-3">
              <p className="text-green-800 font-medium">{success}</p>
            </div>
          </div>
        </div>
      )}

      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <Link
              href="/"
              className="text-gray-500 hover:text-blue-600 flex items-center mb-4 transition-colors font-medium"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Workspaces
            </Link>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-2">
              {selectedProject.name}
            </h1>
            <p className="text-gray-600 text-lg">{selectedProject.description || 'No description'}</p>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {tasksByStatus.map(({ status, tasks }) => {
          const isCollapsed = collapsedSections.has(status.id)
          const isComplete = status.name.toLowerCase().includes('done') || 
                           status.name.toLowerCase().includes('complete')
          
          return (
            <div key={status.id} className="bg-white rounded-lg shadow-sm border border-gray-200">
              {/* Section Header */}
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <button
                  onClick={() => toggleSectionCollapse(status.id)}
                  className="flex items-center space-x-3 w-full text-left hover:bg-gray-100 -mx-2 px-2 py-1 rounded transition-colors"
                >
                  {isCollapsed ? (
                    <ChevronRight className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  )}
                  
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: status.color }}
                    ></div>
                    <h2 className="text-lg font-semibold text-gray-800 uppercase tracking-wide">
                      {status.name}
                    </h2>
                    <span className="bg-gray-200 text-gray-600 px-2 py-1 rounded-full text-sm font-medium">
                      {tasks.length}
                    </span>
                  </div>
                </button>
              </div>

              {/* Tasks Table */}
              {!isCollapsed && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-8">
                          {/* Completion checkbox column */}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Assignee
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Due Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Priority
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {tasks.map((task) => {
                        const isCompleted = isComplete
                        const isSubTask = !!task.parent_task_id
                        
                        return (
                          <tr key={task.id} className="hover:bg-gray-50 transition-colors">
                            {/* Completion Toggle */}
                            <td className="px-6 py-4">
                              <button
                                onClick={() => isCompleted ? handleUncompleteTask(task) : handleCompleteTask(task)}
                                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                                  isCompleted 
                                    ? 'bg-green-500 border-green-500 text-white hover:bg-green-600' 
                                    : 'border-gray-300 hover:border-green-500'
                                }`}
                              >
                                {isCompleted && <Check className="w-3 h-3" />}
                              </button>
                            </td>

                            {/* Task Name */}
                            <td className="px-6 py-4">
                              <div className="flex items-center">
                                {isSubTask && (
                                  <span className="text-blue-500 mr-2 font-bold">↳</span>
                                )}
                                <div>
                                  <div className={`text-sm font-medium ${
                                    isCompleted ? 'text-green-700 line-through' : 'text-gray-900'
                                  }`}>
                                    {task.title}
                                  </div>
                                  {task.description && (
                                    <div className="text-xs text-gray-500 mt-1 line-clamp-1">
                                      {task.description}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Assignee */}
                            <td className="px-6 py-4">
                              {task.assignee ? (
                                <div className="flex items-center">
                                  {task.assignee.avatar_url ? (
                                    <img
                                      src={task.assignee.avatar_url}
                                      alt={task.assignee.name}
                                      className="w-6 h-6 rounded-full mr-2"
                                    />
                                  ) : (
                                    <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center mr-2">
                                      <span className="text-xs font-medium text-white">
                                        {task.assignee.name.charAt(0)}
                                      </span>
                                    </div>
                                  )}
                                  <span className="text-sm text-gray-900">{task.assignee.name}</span>
                                </div>
                              ) : (
                                <span className="text-sm text-gray-400">Unassigned</span>
                              )}
                            </td>

                            {/* Due Date */}
                            <td className="px-6 py-4">
                              {task.due_date ? (
                                <div className="flex items-center text-sm text-gray-900">
                                  <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                                  {new Date(task.due_date).toLocaleDateString()}
                                </div>
                              ) : (
                                <span className="text-sm text-gray-400">No due date</span>
                              )}
                            </td>

                            {/* Priority */}
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                                {task.priority}
                              </span>
                            </td>

                            {/* Status */}
                            <td className="px-6 py-4">
                              {task.status && (
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(task.status)}`}>
                                  {task.status.name}
                                </span>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end space-x-1">
                                <button
                                  onClick={() => handleDeleteTask(task)}
                                  className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                  title="Delete task"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                                <button
                                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                                  title="More options"
                                >
                                  <MoreHorizontal className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>

                  {/* Add Task Button */}
                  <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                    <button className="flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Task
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </AppLayout>
  )
}

export default function ListPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ListPageContent />
    </Suspense>
  )
}