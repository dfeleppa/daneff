'use client'

import { useState, useEffect } from 'react'
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
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Calendar, User, Tag, MoreHorizontal, Plus, ArrowLeft } from 'lucide-react'
import { getUserWorkspaces } from '@/lib/api/users'
import { getProjects, getProjectTasks, getTaskStatuses, updateTask, createTask } from '@/lib/api/projects'

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
}

function TaskCard({ task, onEdit }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-3 cursor-grab hover:shadow-md transition-shadow group"
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-sm font-medium text-gray-900 line-clamp-2">{task.title}</h3>
        <button
          onClick={() => onEdit?.(task)}
          className="text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      {task.description && (
        <p className="text-xs text-gray-600 mb-3 line-clamp-2">{task.description}</p>
      )}

      <div className="flex items-center justify-between">
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
  )
}

interface ColumnProps {
  status: TaskStatus
  tasks: Task[]
  onAddTask: (statusId: string) => void
}

function Column({ status, tasks, onAddTask }: ColumnProps) {
  return (
    <div className="flex-shrink-0 w-72">
      <div className="bg-gray-50 rounded-lg p-4">
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
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </SortableContext>
      </div>
    </div>
  )
}

export default function BoardPage() {
  const { data: session, status } = useSession()
  const searchParams = useSearchParams()
  const projectId = searchParams?.get('project')

  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [taskStatuses, setTaskStatuses] = useState<TaskStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewTaskModal, setShowNewTaskModal] = useState(false)
  const [newTaskStatusId, setNewTaskStatusId] = useState<string | null>(null)
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

  useEffect(() => {
    if (session?.user?.id) {
      loadBoardData()
    }
  }, [session, projectId])

  const loadBoardData = async () => {
    if (!session?.user?.id) return

    try {
      setLoading(true)

      // Get user's workspaces
      const userWorkspaces = await getUserWorkspaces(session.user.id)
      
      if (userWorkspaces.length > 0) {
        // Get projects from the first workspace
        const { projects: workspaceProjects } = await getProjects(userWorkspaces[0].id)
        setProjects(workspaceProjects)

        // Set selected project
        let currentProject = workspaceProjects.find(p => p.id === projectId) || workspaceProjects[0]
        setSelectedProject(currentProject)

        if (currentProject) {
          // Get task statuses for the project
          const { statuses } = await getTaskStatuses(currentProject.id)
          setTaskStatuses(statuses)

          // Get tasks for the project
          const { tasks: projectTasks } = await getProjectTasks(currentProject.id)
          setTasks(projectTasks)
        }
      }
    } catch (error) {
      console.error('Error loading board data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over) return

    const activeTask = tasks.find(task => task.id === active.id)
    if (!activeTask) return

    // Find the target status based on the drop zone
    const targetStatusId = over.id as string
    const targetStatus = taskStatuses.find(status => status.id === targetStatusId)

    if (!targetStatus || activeTask.status_id === targetStatusId) return

    // Update task status in database
    try {
      const { task: updatedTask } = await updateTask(activeTask.id, {
        status_id: targetStatusId
      })

      if (updatedTask) {
        setTasks(tasks.map(task => 
          task.id === activeTask.id 
            ? { ...task, status_id: targetStatusId, status: targetStatus }
            : task
        ))
      }
    } catch (error) {
      console.error('Error updating task status:', error)
    }
  }

  const handleAddTask = (statusId: string) => {
    setNewTaskStatusId(statusId)
    setShowNewTaskModal(true)
  }

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProject || !newTaskStatusId || !session?.user?.id) return

    try {
      const { task } = await createTask({
        title: newTask.title,
        description: newTask.description || null,
        status_id: newTaskStatusId,
        priority: newTask.priority,
        due_date: newTask.due_date || null,
        project_id: selectedProject.id,
        assignee_id: session.user.id,
        reporter_id: session.user.id, // Add the required reporter_id field
      })

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
      }
    } catch (error) {
      console.error('Error creating task:', error)
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
          onDragEnd={handleDragEnd}
        >
          <div className="flex space-x-6 overflow-x-auto pb-4">
            {statusColumns.map(({ status, tasks }) => (
              <Column
                key={status.id}
                status={status}
                tasks={tasks}
                onAddTask={handleAddTask}
              />
            ))}
          </div>
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
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}