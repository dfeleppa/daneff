'use client'

import Link from 'next/link'
import { usePathname, useParams } from 'next/navigation'
import { Kanban, List as ListIcon, Calendar, Table2, BarChart3, Plus } from 'lucide-react'

interface ViewsTabBarProps {
  workspaceId: string
  projectId: string
  onAddTask?: () => void
}

export default function ViewsTabBar({ workspaceId, projectId, onAddTask }: ViewsTabBarProps) {
  const pathname = usePathname()
  const currentView = pathname.split('/').pop()

  const views = [
    {
      id: 'board',
      label: 'Board',
      icon: Kanban,
      href: `/workspace/${workspaceId}/project/${projectId}/board`
    },
    {
      id: 'list',
      label: 'List',
      icon: ListIcon,
      href: `/workspace/${workspaceId}/project/${projectId}/list`
    },
    {
      id: 'calendar',
      label: 'Calendar',
      icon: Calendar,
      href: `/workspace/${workspaceId}/project/${projectId}/calendar`
    },
    {
      id: 'table',
      label: 'Table',
      icon: Table2,
      href: `/workspace/${workspaceId}/project/${projectId}/table`
    },
    {
      id: 'gantt',
      label: 'Gantt',
      icon: BarChart3,
      href: `/workspace/${workspaceId}/project/${projectId}/gantt`
    }
  ]

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-1">
        {views.map((view) => {
          const Icon = view.icon
          const isActive = currentView === view.id
          
          return (
            <Link
              key={view.id}
              href={view.href}
              className={`
                flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors
                ${isActive 
                  ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }
              `}
            >
              <Icon className="w-4 h-4" />
              <span>{view.label}</span>
            </Link>
          )
        })}
      </div>
      
      <div className="flex items-center space-x-2">
        <button 
          onClick={onAddTask}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          <span>Add Task</span>
        </button>
      </div>
    </div>
  )
}