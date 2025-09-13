'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  useDroppable,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Calendar, MoreHorizontal, Plus, ArrowLeft, Trash2 } from 'lucide-react'
import { getUserWorkspaces } from '@/lib/api/users'
import { getProjects, getProjectTasks, getTaskStatuses, updateTask, createTask, deleteTask } from '@/lib/api/projects'

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

interface TaskCardProps {
  task: Task
  onEdit?: (task: Task) => void
  onDelete?: (task: Task) => void
}

function TaskCard({ task, onEdit, onDelete }: TaskCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const priorityColors = {
    low: 'bg-gray-100 text-gray-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    urgent: 'bg-red-100 text-red-800',
  }

  // Close menu when clicking outside
  useEffect(() => {
    if (showMenu) {
      const handleClickOutside = () => setShowMenu(false)
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showMenu])

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-3 hover:shadow-md transition-shadow group relative ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      {/* Drag handle - separate from the menu */}
      <div
        {...attributes}
        {...listeners}
        className="absolute inset-0 cursor-grab active:cursor-grabbing z-0"
        style={{ pointerEvents: showMenu ? 'none' : 'auto' }}
      />
      
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-sm font-medium text-gray-900 line-clamp-2 pointer-events-none">
            {task.title}
          </h3>
          <div className="relative pointer-events-auto">
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setShowMenu(!showMenu)
              }}
              className="text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-100 transition-colors"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            
            {showMenu && (
              <div className="absolute right-0 mt-1 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setShowMenu(false)
                    onEdit?.(task)
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-t-lg"
                >
                  Edit
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setShowMenu(false)
                    onDelete?.(task)
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-b-lg flex items-center"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {task.description && (
          <p className="text-xs text-gray-600 mb-3 line-clamp-2 pointer-events-none">
            {task.description}
          </p>
        )}

        <div className="flex items-center justify-between pointer-events-none">
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityColors[task.priority]}`}>
              {task.priority}
            </span>
            {task.due_date && (
              <div className="flex items-center text-gray-500 text-xs">
                <Calendar className="w-3 h-3 mr-1" />
                {new Date(task.due_date).toLocaleDateString()}
              </div>
            )}
          </div>

          {task.assignee && (
            <div className="flex items-center">
              {task.assignee.avatar_url ? (
                <img
                  src={task.assignee.avatar_url}
                  alt={task.assignee.name}
                  className="w-6 h-6 rounded-full"
                />
              ) : (
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-white">
                    {task.assignee.name.charAt(0)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface ColumnProps {
  status: TaskStatus
  tasks: Task[]
  onAddTask: (statusId: string) => void
  onEditTask: (task: Task) => void
  onDeleteTask: (task: Task) => void
}

function Column({ status, tasks, onAddTask, onEditTask, onDeleteTask }: ColumnProps) {
  const {
    setNodeRef,
    isOver,
  } = useDroppable({
    id: `column-${status.id}`,
  })

  return (
    <div className="flex-shrink-0 w-72">
      <div 
        ref={setNodeRef}
        className={`bg-gray-50 rounded-lg p-4 transition-colors ${
          isOver ? 'bg-blue-50 ring-2 ring-blue-200' : ''
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: status.color }}
            ></div>
            <h2 className="font-medium text-gray-900">{status.name}</h2>
            <span className="text-sm text-gray-500">({tasks.length})</span>
          </div>
          <button
            onClick={() => onAddTask(status.id)}
            className="text-gray-400 hover:text-gray-600"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <SortableContext
          items={tasks.map(task => task.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2 min-h-24">
            {tasks.map((task) => (
              <TaskCard 
                key={task.id} 
                task={task} 
                onEdit={onEditTask}
                onDelete={onDeleteTask}
              />
            ))}
          </div>
        </SortableContext>
      </div>
    </div>
  )
}

function BoardPageContent() {
  const { data: session, status } = useSession()
  const searchParams = useSearchParams()
  const projectId = searchParams?.get('project')

  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [taskStatuses, setTaskStatuses] = useState<TaskStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewTaskModal, setShowNewTaskModal] = useState(false)
  const [showEditTaskModal, setShowEditTaskModal] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [newTaskStatusId, setNewTaskStatusId] = useState<string | null>(null)
  const [taskLoading, setTaskLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    due_date: '',
  })

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

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
      loadBoardData()
    }
  }, [session, projectId])

  const loadBoardData = async () => {
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
        console.log('Loading board data for project:', currentProject.name, currentProject.id)
        
        // Get task statuses for the project
        const { statuses, error: statusError } = await getTaskStatuses(currentProject.id)
        if (statusError) {
          setError(`Failed to load task columns: ${statusError.message}`)
          return
        }
        setTaskStatuses(statuses)

        // Get tasks for the project
        const { tasks: projectTasks, error: tasksError } = await getProjectTasks(currentProject.id)
        if (tasksError) {
          setError(`Failed to load tasks: ${tasksError.message}`)
          return
        }
        setTasks(projectTasks)
        
        console.log('Board data loaded successfully:', {
          project: currentProject.name,
          statuses: statuses.length,
          tasks: projectTasks.length
        })
      }
    } catch (error: any) {
      console.error('Error loading board data:', error)
      setError(`Failed to load board: ${error.message || 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const task = tasks.find(task => task.id === active.id)
    setActiveTask(task || null)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    
    setActiveTask(null)

    if (!over || !active) return

    const activeTask = tasks.find(task => task.id === active.id)
    if (!activeTask) return

    // Extract status ID from the column drop zone
    const overId = over.id as string
    let targetStatusId: string

    if (overId.startsWith('column-')) {
      // Dropped on a column
      targetStatusId = overId.replace('column-', '')
    } else {
      // Dropped on another task, find which column that task is in
      const overTask = tasks.find(task => task.id === overId)
      if (overTask) {
        targetStatusId = overTask.status_id
      } else {
        return
      }
    }

    const targetStatus = taskStatuses.find(status => status.id === targetStatusId)

    if (!targetStatus || activeTask.status_id === targetStatusId) return

    console.log('Moving task:', {
      taskId: activeTask.id,
      taskTitle: activeTask.title,
      fromStatus: activeTask.status_id,
      toStatus: targetStatusId,
      targetStatusName: targetStatus.name
    })

    // Optimistically update the UI
    setTasks(prevTasks => prevTasks.map(task => 
      task.id === activeTask.id 
        ? { ...task, status_id: targetStatusId, status: targetStatus }
        : task
    ))

    // Update task status in database
    try {
      const { task: updatedTask, error } = await updateTask(activeTask.id, {
        status_id: targetStatusId
      })

      if (error) {
        console.error('Error updating task status:', error)
        // Revert optimistic update
        setTasks(prevTasks => prevTasks.map(task => 
          task.id === activeTask.id 
            ? { ...task, status_id: activeTask.status_id, status: activeTask.status }
            : task
        ))
        setError('Failed to update task status. Please try again.')
      } else if (updatedTask) {
        console.log('Task status updated successfully:', updatedTask)
        setSuccess(`Task moved to ${targetStatus.name}!`)
      }
    } catch (error) {
      console.error('Error updating task status:', error)
      // Revert optimistic update
      setTasks(prevTasks => prevTasks.map(task => 
        task.id === activeTask.id 
          ? { ...task, status_id: activeTask.status_id, status: activeTask.status }
          : task
      ))
      setError('Failed to update task status. Please try again.')
    }
  }

  const handleAddTask = (statusId: string) => {
    setNewTaskStatusId(statusId)
    setShowNewTaskModal(true)
  }

  const handleEditTask = (task: Task) => {
    setEditingTask(task)
    setShowEditTaskModal(true)
  }

  const handleDeleteTask = async (task: Task) => {
    if (!confirm(`Are you sure you want to delete "${task.title}"? This action cannot be undone.`)) {
      return
    }

    try {
      setError(null)
      const { success } = await deleteTask(task.id)

      if (success) {
        setTasks(tasks.filter(t => t.id !== task.id))
        setSuccess('Task deleted successfully!')
      } else {
        setError('Failed to delete task. Please try again.')
      }
    } catch (error) {
      console.error('Error deleting task:', error)
      setError('Failed to delete task. Please try again.')
    }
  }

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProject || !newTaskStatusId || !session?.user?.id) return

    try {
      setTaskLoading(true)
      setError(null)

      const { task, error: createError } = await createTask({
        title: newTask.title,
        description: newTask.description || null,
        status_id: newTaskStatusId,
        priority: newTask.priority,
        due_date: newTask.due_date || null,
        project_id: selectedProject.id,
        assignee_id: session.user.id,
        reporter_id: session.user.id,
      })

      if (createError) {
        setError('Failed to create task. Please try again.')
        return
      }

      if (task) {
        setTasks([...tasks, task])
        setShowNewTaskModal(false)
        setNewTask({
          title: '',
          description: '',
          priority: 'medium',
          due_date: '',
        })
        setNewTaskStatusId(null)
        setSuccess('Task created successfully!')
      }
    } catch (error) {
      console.error('Error creating task:', error)
      setError('Failed to create task. Please try again.')
    } finally {
      setTaskLoading(false)
    }
  }

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingTask) return

    try {
      setTaskLoading(true)
      setError(null)

      const { task, error: updateError } = await updateTask(editingTask.id, {
        title: editingTask.title,
        description: editingTask.description,
        priority: editingTask.priority,
        due_date: editingTask.due_date,
      })

      if (updateError) {
        setError('Failed to update task. Please try again.')
        return
      }

      if (task) {
        setTasks(tasks.map(t => t.id === task.id ? task : t))
        setShowEditTaskModal(false)
        setEditingTask(null)
        setSuccess('Task updated successfully!')
      }
    } catch (error) {
      console.error('Error updating task:', error)
      setError('Failed to update task. Please try again.')
    } finally {
      setTaskLoading(false)
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
          <p className="text-gray-600 mb-4">Please select a project to view its board.</p>
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

  // Group tasks by status
  const statusColumns = taskStatuses.map(status => ({
    status,
    tasks: tasks.filter(task => task.status_id === status.id)
  }))

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="text-2xl font-bold text-blue-600 mr-8">
                TaskFlow
              </Link>
              <nav className="hidden md:flex md:space-x-8">
                <Link href="/" className="text-gray-500 hover:text-blue-600 px-3 py-2 text-sm font-medium">
                  Dashboard
                </Link>
                <Link href="/projects" className="text-gray-500 hover:text-blue-600 px-3 py-2 text-sm font-medium">
                  Projects
                </Link>
                <Link href="/board" className="text-gray-900 hover:text-blue-600 px-3 py-2 text-sm font-medium">
                  Board
                </Link>
              </nav>
            </div>
            
            <div className="flex items-center space-x-4">
              <select 
                value={selectedProject.id}
                onChange={(e) => {
                  const project = projects.find(p => p.id === e.target.value)
                  setSelectedProject(project || null)
                }}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {projects.map(project => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
              <button
                onClick={() => handleAddTask(taskStatuses[0]?.id)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Task
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Board Content */}
      <main className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
        
        <div className="mb-6 flex items-center space-x-4">
          <Link
            href="/projects"
            className="text-gray-500 hover:text-gray-700 flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Projects
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">{selectedProject.name}</h1>
            <p className="text-gray-600">{selectedProject.description || 'No description'}</p>
          </div>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex space-x-6 overflow-x-auto pb-4">
            {statusColumns.map(({ status, tasks }) => (
              <Column
                key={status.id}
                status={status}
                tasks={tasks}
                onAddTask={handleAddTask}
                onEditTask={handleEditTask}
                onDeleteTask={handleDeleteTask}
              />
            ))}
          </div>
          
          <DragOverlay>
            {activeTask ? (
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 cursor-grabbing opacity-90 rotate-3">
                <h3 className="text-sm font-medium text-gray-900 mb-2">{activeTask.title}</h3>
                {activeTask.description && (
                  <p className="text-xs text-gray-600 mb-2">{activeTask.description}</p>
                )}
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  activeTask.priority === 'low' ? 'bg-gray-100 text-gray-800' :
                  activeTask.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  activeTask.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {activeTask.priority}
                </span>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </main>

      {/* Create Task Modal */}
      {showNewTaskModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Create New Task</h2>
            <form onSubmit={handleCreateTask}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter task title"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-20"
                  placeholder="Enter task description"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
                <select
                  value={newTask.priority}
                  onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as 'low' | 'medium' | 'high' | 'urgent' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Due Date
                </label>
                <input
                  type="date"
                  value={newTask.due_date}
                  onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowNewTaskModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={taskLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {taskLoading && (
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  {taskLoading ? 'Creating...' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {showEditTaskModal && editingTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Edit Task</h2>
            <form onSubmit={handleUpdateTask}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  value={editingTask.title}
                  onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter task title"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={editingTask.description || ''}
                  onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-20"
                  placeholder="Enter task description"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
                <select
                  value={editingTask.priority}
                  onChange={(e) => setEditingTask({ ...editingTask, priority: e.target.value as 'low' | 'medium' | 'high' | 'urgent' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Due Date
                </label>
                <input
                  type="date"
                  value={editingTask.due_date || ''}
                  onChange={(e) => setEditingTask({ ...editingTask, due_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditTaskModal(false)
                    setEditingTask(null)
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={taskLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {taskLoading && (
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  {taskLoading ? 'Updating...' : 'Update Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default function BoardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    }>
      <BoardPageContent />
    </Suspense>
  )
}