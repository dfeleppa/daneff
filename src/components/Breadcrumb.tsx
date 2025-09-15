'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, Home } from 'lucide-react'
import { useEffect, useState } from 'react'

interface BreadcrumbItem {
  label: string
  href: string
  isActive: boolean
}

interface WorkspaceData {
  id: string
  name: string
}

interface ProjectData {
  id: string
  name: string
}

export default function Breadcrumb() {
  const pathname = usePathname()
  const [workspaceData, setWorkspaceData] = useState<WorkspaceData | null>(null)
  const [projectData, setProjectData] = useState<ProjectData | null>(null)
  const [loading, setLoading] = useState(false)

  // Parse the current path to extract IDs
  const pathSegments = pathname.split('/').filter(Boolean)
  const workspaceId = pathSegments.includes('workspace') ? pathSegments[pathSegments.indexOf('workspace') + 1] : null
  const projectId = pathSegments.includes('project') ? pathSegments[pathSegments.indexOf('project') + 1] : null
  const currentView = pathSegments[pathSegments.length - 1]

  // Fetch workspace and project data when needed
  useEffect(() => {
    const fetchData = async () => {
      if (!workspaceId && !projectId) return
      
      setLoading(true)
      try {
        // Fetch workspace data if we have a workspace ID
        if (workspaceId && !workspaceData) {
          const workspaceRes = await fetch(`/api/workspaces/${workspaceId}`)
          if (workspaceRes.ok) {
            const workspace = await workspaceRes.json()
            setWorkspaceData(workspace)
          }
        }

        // Fetch project data if we have a project ID
        if (projectId && !projectData) {
          const projectRes = await fetch(`/api/projects/${projectId}`)
          if (projectRes.ok) {
            const project = await projectRes.json()
            setProjectData(project)
          }
        }
      } catch (error) {
        console.error('Error fetching breadcrumb data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [workspaceId, projectId, workspaceData, projectData])

  // Build breadcrumb items based on current path
  const buildBreadcrumbs = (): BreadcrumbItem[] => {
    const breadcrumbs: BreadcrumbItem[] = []

    // Dashboard (always available)
    if (pathname === '/dashboard') {
      breadcrumbs.push({
        label: 'Dashboard',
        href: '/dashboard',
        isActive: true
      })
      return breadcrumbs
    }

    // Add Dashboard as first item for all other pages
    breadcrumbs.push({
      label: 'Dashboard',
      href: '/dashboard',
      isActive: false
    })

    // Workspace level
    if (workspaceId) {
      breadcrumbs.push({
        label: workspaceData?.name || 'Workspace',
        href: `/workspace/${workspaceId}`,
        isActive: !projectId && !pathSegments.includes('projects')
      })

      // Projects level
      if (pathSegments.includes('projects')) {
        breadcrumbs.push({
          label: 'Projects',
          href: `/workspace/${workspaceId}/projects`,
          isActive: !projectId
        })
      }

      // Project level
      if (projectId && projectData) {
        breadcrumbs.push({
          label: projectData.name,
          href: `/workspace/${workspaceId}/project/${projectId}`,
          isActive: !['board', 'list', 'gantt', 'calendar', 'table'].includes(currentView)
        })

        // View level
        if (['board', 'list', 'gantt', 'calendar', 'table'].includes(currentView)) {
          const viewLabels = {
            board: 'Board',
            list: 'List',
            gantt: 'Gantt',
            calendar: 'Calendar',
            table: 'Table'
          }

          breadcrumbs.push({
            label: viewLabels[currentView as keyof typeof viewLabels],
            href: pathname,
            isActive: true
          })
        }
      }
    }

    return breadcrumbs
  }

  const breadcrumbs = buildBreadcrumbs()

  if (loading && breadcrumbs.some(b => b.label.includes('Workspace') || b.label.includes('Project'))) {
    return (
      <div className="flex items-center space-x-2 px-6 py-2 text-sm text-gray-500">
        <div className="animate-pulse">Loading navigation...</div>
      </div>
    )
  }

  return (
    <nav className="flex items-center space-x-2 px-6 py-2 text-sm">
      <Home className="w-4 h-4 text-gray-400" />
      {breadcrumbs.map((item, index) => (
        <div key={index} className="flex items-center space-x-2">
          {index > 0 && <ChevronRight className="w-4 h-4 text-gray-300" />}
          {item.isActive ? (
            <span className="text-blue-600 font-medium">{item.label}</span>
          ) : (
            <Link
              href={item.href}
              className="text-gray-600 hover:text-blue-600 transition-colors"
            >
              {item.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  )
}