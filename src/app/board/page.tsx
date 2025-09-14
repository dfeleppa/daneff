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
import { Calendar, MoreHorizontal, Plus, ArrowLeft, Trash2, Check, Users, ChevronDown, ChevronRight } from 'lucide-react'
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

interface TaskCardProps {
  task: Task
  onEdit?: (task: Task) => void
  onDelete?: (task: Task) => void
  onComplete?: (task: Task) => void
  onUncomplete?: (task: Task) => void
  onAddSubTask?: (task: Task) => void
  onToggleCollapse?: (task: Task) => void
  isCollapsed?: boolean
  isHidden?: boolean
}

function TaskCard({ task, onEdit, onDelete, onComplete, onUncomplete, onAddSubTask, onToggleCollapse, isCollapsed, isHidden }: TaskCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [isPointerDown, setIsPointerDown] = useState(false)
  const [dragStartTime, setDragStartTime] = useState(0)
  const [startCoords, setStartCoords] = useState({ x: 0, y: 0 })
  
  const isSubTask = !!task.parent_task_id
  const isCompleted = task.status?.name.toLowerCase().includes('done') || 
                     task.status?.name.toLowerCase().includes('complete')
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: task.id,
    disabled: isSubTask // Disable dragging for sub-tasks
  })

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

  // Don't render if this task should be hidden due to collapsed parent
  if (isHidden) {
    return null
  }

  // Custom pointer event handlers for click vs drag detection
  const handlePointerDown = (e: React.PointerEvent) => {
    // Don't handle pointer events on action buttons
    if ((e.target as HTMLElement).closest('[data-action-button]') || 
        (e.target as HTMLElement).closest('[data-menu]')) {
      return
    }

    setIsPointerDown(true)
    setDragStartTime(Date.now())
    setStartCoords({ x: e.clientX, y: e.clientY })
    
    // Call the dnd-kit listeners
    if (listeners?.onPointerDown) {
      listeners.onPointerDown(e as any)
    }
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    // Don't handle pointer events on action buttons
    if ((e.target as HTMLElement).closest('[data-action-button]') || 
        (e.target as HTMLElement).closest('[data-menu]')) {
      return
    }

    const timeDiff = Date.now() - dragStartTime
    const distance = Math.sqrt(
      Math.pow(e.clientX - startCoords.x, 2) + Math.pow(e.clientY - startCoords.y, 2)
    )

    // If it was a quick click (< 200ms) and didn't move much (< 5px), treat as click
    if (timeDiff < 200 && distance < 5 && !isDragging) {
      onEdit?.(task)
    }

    setIsPointerDown(false)
    
    // Call the dnd-kit listeners
    if (listeners?.onPointerUp) {
      listeners.onPointerUp(e as any)
    }
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (listeners?.onPointerMove) {
      listeners.onPointerMove(e as any)
    }
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
      {...attributes}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerMove={handlePointerMove}
      className={`
        ${isSubTask 
          ? 'bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border-l-4 border-l-blue-400 border border-blue-100/50 p-4 mb-3 ml-6' 
          : 'bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-6 transition-all duration-200'
        } 
        hover:shadow-xl hover:border-gray-300/50 hover:-translate-y-1 transform group relative 
        ${isSubTask 
          ? 'cursor-pointer' // Sub-tasks are not draggable, only clickable
          : isPointerDown 
            ? 'cursor-grabbing shadow-2xl' 
            : 'cursor-pointer hover:bg-white'
        }
        ${isDragging ? 'opacity-60 cursor-grabbing shadow-2xl scale-105' : ''} 
        ${isCompleted ? (isSubTask ? 'bg-green-50/80 border-l-green-400 border-green-100/50' : 'bg-green-50/90 border-green-200/50') : ''}
      `}
    >
      
      <div className="relative z-20">
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1 mr-2">
            <div className="flex items-center">
              {/* Collapse/Expand button for parent tasks */}
              {!isSubTask && task.sub_tasks && task.sub_tasks.length > 0 && (
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onToggleCollapse?.(task)
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="mr-2 p-0.5 hover:bg-gray-200 rounded transition-colors"
                  data-action-button
                  title={isCollapsed ? 'Expand sub-tasks' : 'Collapse sub-tasks'}
                >
                  {isCollapsed ? (
                    <ChevronRight className="w-3 h-3 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-3 h-3 text-gray-500" />
                  )}
                </button>
              )}
              <h3 className={`${isSubTask ? 'text-sm' : 'text-base'} font-semibold line-clamp-2 pointer-events-none ${
                isCompleted ? 'text-green-700 line-through' : 'text-gray-800'
              }`}>
                {isSubTask && <span className="text-blue-500 mr-2 font-bold text-lg">↳</span>}
                {task.title}
              </h3>
            </div>
            {/* Sub-tasks indicator - only show on parent tasks */}
            {!isSubTask && task.sub_tasks && task.sub_tasks.length > 0 && (
              <div className="flex items-center mt-3 text-sm text-gray-600">
                <Users className="w-4 h-4 mr-2" />
                <span className="font-medium">{task.sub_tasks.length}</span>
                <span className="ml-1">sub-task{task.sub_tasks.length !== 1 ? 's' : ''}</span>
                {task.completion_percentage !== undefined && (
                  <span className="ml-3 text-blue-600 font-semibold bg-blue-50 px-2 py-1 rounded-lg text-xs">
                    {task.completion_percentage}% complete
                  </span>
                )}
                {isCollapsed && (
                  <span className="ml-3 text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">collapsed</span>
                )}
              </div>
            )}
            {/* Sub-task label */}
            {isSubTask && (
              <div className="flex items-center mt-2">
                <span className="text-xs text-blue-600 font-semibold bg-blue-100/70 px-3 py-1.5 rounded-full">
                  Sub-task
                </span>
              </div>
            )}
          </div>
          
          {/* Action buttons - inline with 3-dots, smaller for sub-tasks */}
          <div 
            className="flex items-center space-x-1 pointer-events-auto opacity-0 group-hover:opacity-100 transition-opacity relative z-30"
            data-action-button
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {isCompleted ? (
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onUncomplete?.(task)
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                className={`${isSubTask ? 'p-0.5' : 'p-1'} text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded transition-colors`}
                title="Mark as incomplete"
                data-action-button
              >
                <Check className={`${isSubTask ? 'w-3 h-3' : 'w-4 h-4'}`} />
              </button>
            ) : (
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onComplete?.(task)
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                className={`${isSubTask ? 'p-0.5' : 'p-1'} text-green-600 hover:text-green-700 hover:bg-green-50 rounded transition-colors`}
                title="Mark as complete"
                data-action-button
              >
                <Check className={`${isSubTask ? 'w-3 h-3' : 'w-4 h-4'}`} />
              </button>
            )}
            {/* Only show Add Sub-task button on parent tasks */}
            {!isSubTask && (
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onAddSubTask?.(task)
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                title="Add sub-task"
                data-action-button
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
            <div className="relative" data-menu>
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setShowMenu(!showMenu)
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                className={`text-gray-400 hover:text-gray-600 ${isSubTask ? 'p-0.5' : 'p-1'} rounded hover:bg-gray-100 transition-colors`}
                data-action-button
              >
                <MoreHorizontal className={`${isSubTask ? 'w-3 h-3' : 'w-4 h-4'}`} />
              </button>
              
              {showMenu && (
                <div 
                  className="absolute right-0 mt-1 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-50"
                  onMouseDown={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setShowMenu(false)
                      onEdit?.(task)
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
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
                    onMouseDown={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-b-lg flex items-center"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {task.description && (
          <p className={`${isSubTask ? 'text-xs' : 'text-xs'} text-gray-600 ${isSubTask ? 'mb-2' : 'mb-3'} line-clamp-2 pointer-events-none`}>
            {task.description}
          </p>
        )}

        <div className="flex items-center justify-between pointer-events-none">
          <div className="flex items-center space-x-2">
            <span className={`${isSubTask ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-xs'} rounded-full font-medium ${priorityColors[task.priority]}`}>
              {task.priority}
            </span>
            {task.due_date && (
              <div className={`flex items-center text-gray-500 ${isSubTask ? 'text-xs' : 'text-xs'}`}>
                <Calendar className={`${isSubTask ? 'w-2.5 h-2.5' : 'w-3 h-3'} mr-1`} />
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
                  className={`${isSubTask ? 'w-5 h-5' : 'w-6 h-6'} rounded-full`}
                />
              ) : (
                <div className={`${isSubTask ? 'w-5 h-5' : 'w-6 h-6'} bg-blue-600 rounded-full flex items-center justify-center`}>
                  <span className={`${isSubTask ? 'text-xs' : 'text-xs'} font-medium text-white`}>
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
  onCompleteTask: (task: Task) => void
  onUncompleteTask: (task: Task) => void
  onAddSubTask: (task: Task) => void
  onToggleCollapse: (task: Task) => void
  collapsedTasks: Set<string>
}

function Column({ status, tasks, onAddTask, onEditTask, onDeleteTask, onCompleteTask, onUncompleteTask, onAddSubTask, onToggleCollapse, collapsedTasks }: ColumnProps) {
  const {
    setNodeRef,
    isOver,
  } = useDroppable({
    id: `column-${status.id}`,
  })

  // Determine column styling based on status name
  const getColumnStyle = (statusName: string) => {
    const name = statusName.toLowerCase()
    if (name.includes('to do') || name.includes('todo') || name.includes('backlog')) {
      return {
        bg: 'bg-gradient-to-b from-slate-50 to-slate-100/50',
        border: 'border-slate-200',
        header: 'bg-slate-100/60'
      }
    } else if (name.includes('progress') || name.includes('doing') || name.includes('active')) {
      return {
        bg: 'bg-gradient-to-b from-blue-50 to-blue-100/50',
        border: 'border-blue-200',
        header: 'bg-blue-100/60'
      }
    } else if (name.includes('review') || name.includes('testing') || name.includes('qa')) {
      return {
        bg: 'bg-gradient-to-b from-amber-50 to-amber-100/50',
        border: 'border-amber-200',
        header: 'bg-amber-100/60'
      }
    } else if (name.includes('done') || name.includes('complete') || name.includes('finished')) {
      return {
        bg: 'bg-gradient-to-b from-green-50 to-green-100/50',
        border: 'border-green-200',
        header: 'bg-green-100/60'
      }
    } else {
      return {
        bg: 'bg-gradient-to-b from-gray-50 to-gray-100/50',
        border: 'border-gray-200',
        header: 'bg-gray-100/60'
      }
    }
  }

  const columnStyle = getColumnStyle(status.name)

  return (
    <div className="flex-shrink-0 w-80">
      <div 
        ref={setNodeRef}
        className={`${columnStyle.bg} ${columnStyle.border} rounded-2xl border-2 transition-all duration-200 shadow-sm backdrop-blur-sm ${
          isOver ? 'ring-4 ring-blue-400/30 shadow-lg scale-105 transform' : ''
        }`}
      >
        <div className={`${columnStyle.header} rounded-t-2xl px-6 py-4 border-b ${columnStyle.border}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div
                className="w-4 h-4 rounded-full shadow-sm border-2 border-white/50"
                style={{ backgroundColor: status.color }}
              ></div>
              <h2 className="font-semibold text-gray-800 text-lg">{status.name}</h2>
              <span className="text-sm text-gray-500 bg-white/60 px-2.5 py-1 rounded-full font-medium">
                {tasks.length}
              </span>
            </div>
            <button
              onClick={() => onAddTask(status.id)}
              className="text-gray-500 hover:text-gray-700 hover:bg-white/50 p-2 rounded-lg transition-all duration-200"
              title="Add new task"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <SortableContext
            items={tasks.map(task => task.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3 min-h-32">
              {tasks.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-3">
                    <Plus className="w-12 h-12 mx-auto opacity-30" />
                  </div>
                  <p className="text-gray-500 text-sm font-medium">No tasks yet</p>
                  <p className="text-gray-400 text-xs mt-1">Click the + button to add a task</p>
                </div>
              ) : (
                tasks.map((task) => (
                  <TaskCard 
                    key={task.id} 
                    task={task} 
                    onEdit={onEditTask}
                    onDelete={onDeleteTask}
                    onComplete={onCompleteTask}
                    onUncomplete={onUncompleteTask}
                    onAddSubTask={onAddSubTask}
                    onToggleCollapse={onToggleCollapse}
                    isCollapsed={collapsedTasks.has(task.id)}
                    isHidden={task.parent_task_id ? collapsedTasks.has(task.parent_task_id) : false}
                  />
                ))
              )}
            </div>
          </SortableContext>
        </div>
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
  const [collapsedTasks, setCollapsedTasks] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [showNewTaskModal, setShowNewTaskModal] = useState(false)
  const [showEditTaskModal, setShowEditTaskModal] = useState(false)
  const [showSubTaskModal, setShowSubTaskModal] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [parentTaskForSubTask, setParentTaskForSubTask] = useState<Task | null>(null)
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
  const [newSubTask, setNewSubTask] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
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

    // Find all tasks that need to be moved (parent + sub-tasks)
    const tasksToMove: Task[] = []
    
    if (!activeTask.parent_task_id) {
      // Moving a parent task - include all its sub-tasks
      tasksToMove.push(activeTask)
      const subTasks = tasks.filter(task => task.parent_task_id === activeTask.id)
      tasksToMove.push(...subTasks)
    } else {
      // Moving a sub-task - only move the sub-task itself
      tasksToMove.push(activeTask)
    }

    console.log('Moving tasks:', {
      parentTask: activeTask.title,
      tasksToMove: tasksToMove.length,
      fromStatus: activeTask.status_id,
      toStatus: targetStatusId,
      targetStatusName: targetStatus.name
    })

    // Optimistically update the UI for all tasks
    setTasks(prevTasks => prevTasks.map(task => {
      const taskToMove = tasksToMove.find(t => t.id === task.id)
      return taskToMove 
        ? { ...task, status_id: targetStatusId, status: targetStatus }
        : task
    }))

    // Update all tasks in database
    try {
      const updatePromises = tasksToMove.map(task => 
        updateTask(task.id, { status_id: targetStatusId })
      )
      
      const results = await Promise.all(updatePromises)
      
      // Check if any updates failed
      const failedUpdates = results.filter(result => result.error)
      if (failedUpdates.length > 0) {
        console.error('Some task updates failed:', failedUpdates)
        // Revert optimistic updates for failed tasks
        setTasks(prevTasks => prevTasks.map(task => {
          const failedTask = failedUpdates.find(result => 
            result.error && tasksToMove.find(t => t.id === task.id)
          )
          return failedTask 
            ? { ...task, status_id: activeTask.status_id, status: activeTask.status }
            : task
        }))
        setError('Failed to update some tasks. Please try again.')
      } else {
        console.log('All tasks moved successfully')
        const taskCount = tasksToMove.length
        setSuccess(`${taskCount} task${taskCount !== 1 ? 's' : ''} moved to ${targetStatus.name}!`)
      }
    } catch (error) {
      console.error('Error updating task statuses:', error)
      // Revert all optimistic updates
      setTasks(prevTasks => prevTasks.map(task => {
        const taskToMove = tasksToMove.find(t => t.id === task.id)
        return taskToMove 
          ? { ...task, status_id: activeTask.status_id, status: activeTask.status }
          : task
      }))
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

  const handleCompleteTask = async (task: Task) => {
    if (!selectedProject) return

    try {
      setError(null)
      const { success, task: updatedTask } = await markTaskComplete(task.id, selectedProject.id)

      if (success && updatedTask) {
        // Refresh tasks to get updated data including parent task completion percentages
        loadBoardData()
        setSuccess('Task marked as complete!')
      } else {
        setError('Failed to mark task as complete. Please try again.')
      }
    } catch (error) {
      console.error('Error completing task:', error)
      setError('Failed to mark task as complete. Please try again.')
    }
  }

  const handleUncompleteTask = async (task: Task) => {
    if (!selectedProject) return

    try {
      setError(null)
      const { success, task: updatedTask } = await markTaskIncomplete(task.id, selectedProject.id)

      if (success && updatedTask) {
        // Refresh tasks to get updated data including parent task completion percentages
        loadBoardData()
        setSuccess('Task marked as incomplete!')
      } else {
        setError('Failed to mark task as incomplete. Please try again.')
      }
    } catch (error) {
      console.error('Error uncompleting task:', error)
      setError('Failed to mark task as incomplete. Please try again.')
    }
  }

  const handleAddSubTask = (parentTask: Task) => {
    setParentTaskForSubTask(parentTask)
    setShowSubTaskModal(true)
  }

  const handleToggleCollapse = (task: Task) => {
    setCollapsedTasks(prev => {
      const newCollapsed = new Set(prev)
      if (newCollapsed.has(task.id)) {
        newCollapsed.delete(task.id)
      } else {
        newCollapsed.add(task.id)
      }
      return newCollapsed
    })
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

  const handleCreateSubTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProject || !parentTaskForSubTask || !session?.user?.id) return

    try {
      setTaskLoading(true)
      setError(null)

      // Use the same status as the parent task initially
      const { task, error: createError } = await createSubTask(parentTaskForSubTask.id, {
        title: newSubTask.title,
        description: newSubTask.description || '',
        priority: newSubTask.priority,
        assignee_id: session.user.id,
        reporter_id: session.user.id,
        project_id: selectedProject.id,
        status_id: parentTaskForSubTask.status_id,
      })

      if (createError) {
        setError('Failed to create sub-task. Please try again.')
        return
      }

      if (task) {
        // Refresh tasks to get updated parent-child relationships
        loadBoardData()
        setShowSubTaskModal(false)
        setNewSubTask({
          title: '',
          description: '',
          priority: 'medium',
        })
        setParentTaskForSubTask(null)
        setSuccess('Sub-task created successfully!')
      }
    } catch (error) {
      console.error('Error creating sub-task:', error)
      setError('Failed to create sub-task. Please try again.')
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

  // Group tasks by status and handle collapsed state
  const statusColumns = taskStatuses.map(status => {
    const statusTasks = tasks.filter(task => task.status_id === status.id)
    
    // Filter out sub-tasks whose parents are collapsed
    const visibleTasks = statusTasks.filter(task => {
      // If it's a sub-task, check if parent is collapsed
      if (task.parent_task_id) {
        return !collapsedTasks.has(task.parent_task_id)
      }
      // Parent tasks are always visible
      return true
    })
    
    return {
      status,
      tasks: visibleTasks
    }
  })

  const boardActions = (
    <>
      <select 
        value={selectedProject.id}
        onChange={(e) => {
          const project = projects.find(p => p.id === e.target.value)
          setSelectedProject(project || null)
        }}
        className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all duration-200 shadow-sm"
      >
        {projects.map(project => (
          <option key={project.id} value={project.id}>{project.name}</option>
        ))}
      </select>
      <button
        onClick={() => handleAddTask(taskStatuses[0]?.id)}
        className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2.5 rounded-xl hover:from-blue-700 hover:to-indigo-700 text-sm font-medium flex items-center transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
      >
        <Plus className="w-4 h-4 mr-2" />
        New Task
      </button>
    </>
  )

  return (
    <AppLayout actions={boardActions}>
      {/* Board Content */}
      <main className="max-w-full mx-auto px-6 sm:px-8 lg:px-10 py-10">
        {/* Error and Success Messages */}
        {error && (
          <div className="mb-8 bg-red-50/80 backdrop-blur-sm border border-red-200/50 rounded-2xl p-6 shadow-sm">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-red-800 font-medium">{error}</p>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-8 bg-green-50/80 backdrop-blur-sm border border-green-200/50 rounded-2xl p-6 shadow-sm">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-green-800 font-medium">{success}</p>
              </div>
            </div>
          </div>
        )}
        
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <Link
                href="/projects"
                className="text-gray-500 hover:text-blue-600 flex items-center mb-4 transition-colors font-medium"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Projects
              </Link>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-2">
                {selectedProject.name}
              </h1>
              <p className="text-gray-600 text-lg">{selectedProject.description || 'No description'}</p>
            </div>
          </div>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex space-x-8 overflow-x-auto pb-8">
            {statusColumns.map(({ status, tasks }) => (
              <Column
                key={status.id}
                status={status}
                tasks={tasks}
                onAddTask={handleAddTask}
                onEditTask={handleEditTask}
                onDeleteTask={handleDeleteTask}
                onCompleteTask={handleCompleteTask}
                onUncompleteTask={handleUncompleteTask}
                onAddSubTask={handleAddSubTask}
                onToggleCollapse={handleToggleCollapse}
                collapsedTasks={collapsedTasks}
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

      {/* Create Sub-Task Modal */}
      {showSubTaskModal && parentTaskForSubTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Create Sub-task for "{parentTaskForSubTask.title}"
            </h2>
            <form onSubmit={handleCreateSubTask}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sub-task Title *
                </label>
                <input
                  type="text"
                  required
                  value={newSubTask.title}
                  onChange={(e) => setNewSubTask({ ...newSubTask, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter sub-task title"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={newSubTask.description}
                  onChange={(e) => setNewSubTask({ ...newSubTask, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-20"
                  placeholder="Enter sub-task description"
                />
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
                <select
                  value={newSubTask.priority}
                  onChange={(e) => setNewSubTask({ ...newSubTask, priority: e.target.value as 'low' | 'medium' | 'high' | 'urgent' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowSubTaskModal(false)
                    setParentTaskForSubTask(null)
                    setNewSubTask({
                      title: '',
                      description: '',
                      priority: 'medium',
                    })
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
                  {taskLoading ? 'Creating...' : 'Create Sub-task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
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