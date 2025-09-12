'use client'

import { useState } from 'react'
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
import { mockTasks, mockTaskStatuses, mockProjects } from '@/lib/mock-data'
import { Task, TaskStatus } from '@/types'
import { Calendar, User, Tag, MoreHorizontal, Plus } from 'lucide-react'
import Link from 'next/link'

interface TaskCardProps {
  task: Task
}

function TaskCard({ task }: TaskCardProps) {
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
      className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-medium text-gray-900 text-sm">{task.title}</h4>
        <button className="text-gray-400 hover:text-gray-600">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>
      
      {task.description && (
        <p className="text-gray-600 text-xs mb-3 line-clamp-2">{task.description}</p>
      )}
      
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityColors[task.priority]}`}>
            {task.priority}
          </span>
          {task.tags.length > 0 && (
            <div className="flex items-center space-x-1">
              <Tag className="w-3 h-3 text-gray-400" />
              <span className="text-xs text-gray-500">{task.tags.length}</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {task.dueDate && (
            <div className="flex items-center text-gray-500">
              <Calendar className="w-3 h-3 mr-1" />
              <span className="text-xs">{task.dueDate.toLocaleDateString()}</span>
            </div>
          )}
          {task.assignee && (
            <div className="w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center">
              <span className="text-xs text-white font-medium">
                {task.assignee.name.charAt(0)}
              </span>
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
}

function Column({ status, tasks, onAddTask }: ColumnProps) {
  return (
    <div className="flex-1 min-w-80">
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: status.color }}
            />
            <h3 className="font-semibold text-gray-900">{status.name}</h3>
            <span className="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full">
              {tasks.length}
            </span>
          </div>
          <button 
            onClick={() => onAddTask(status.id)}
            className="text-gray-400 hover:text-gray-600"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {tasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </SortableContext>
      </div>
    </div>
  )
}

export default function TaskBoard() {
  const [tasks, setTasks] = useState<Task[]>(mockTasks)
  const [selectedProject, setSelectedProject] = useState(mockProjects[0])
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event

    if (active.id !== over?.id) {
      setTasks((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id)
        const newIndex = items.findIndex(item => item.id === over?.id)

        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  const handleAddTask = (statusId: string) => {
    // This would open a task creation modal in a real app
    console.log(`Add task to ${statusId}`)
  }

  const projectTasks = tasks.filter(task => task.project.id === selectedProject.id)
  const statusColumns = mockTaskStatuses.map(status => ({
    status,
    tasks: projectTasks.filter(task => task.status.id === status.id)
  }))

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="text-2xl font-bold text-primary-600 mr-8">
                TaskFlow
              </Link>
              <nav className="hidden md:flex md:space-x-8">
                <Link href="/" className="text-gray-500 hover:text-primary-600 px-3 py-2 text-sm font-medium">
                  Dashboard
                </Link>
                <Link href="/projects" className="text-gray-500 hover:text-primary-600 px-3 py-2 text-sm font-medium">
                  Projects
                </Link>
                <Link href="/board" className="text-gray-900 hover:text-primary-600 px-3 py-2 text-sm font-medium">
                  Board
                </Link>
                <Link href="/team" className="text-gray-500 hover:text-primary-600 px-3 py-2 text-sm font-medium">
                  Team
                </Link>
              </nav>
            </div>
            
            <div className="flex items-center space-x-4">
              <select 
                value={selectedProject.id}
                onChange={(e) => setSelectedProject(mockProjects.find(p => p.id === e.target.value) || mockProjects[0])}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                {mockProjects.map(project => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
              <button className="btn-primary text-sm">
                <Plus className="w-4 h-4 mr-2" />
                New Task
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Board Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{selectedProject.name}</h1>
          <p className="text-gray-600">{selectedProject.description}</p>
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
    </div>
  )
}
