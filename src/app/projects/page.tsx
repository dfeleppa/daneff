'use client'

import { useState } from 'react'
import { mockProjects, mockUsers } from '@/lib/mock-data'
import { Project } from '@/types'
import { Plus, Search, Calendar, Users, MoreHorizontal, Archive, Edit, Trash2, LogOut, Bell, Settings, User } from 'lucide-react'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'

interface ProjectCardProps {
  project: Project
  onEdit: (project: Project) => void
  onArchive: (project: Project) => void
  onDelete: (project: Project) => void
}

function ProjectCard({ project, onEdit, onArchive, onDelete }: ProjectCardProps) {
  const [showMenu, setShowMenu] = useState(false)

  const statusColors = {
    active: 'bg-green-100 text-green-800',
    on_hold: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-blue-100 text-blue-800',
    archived: 'bg-gray-100 text-gray-800',
  }

  const statusLabels = {
    active: 'Active',
    on_hold: 'On Hold',
    completed: 'Completed',
    archived: 'Archived',
  }

  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center space-x-3">
          <div
            className="w-4 h-4 rounded"
            style={{ backgroundColor: project.color }}
          />
          <h3 className="text-lg font-semibold text-gray-900">{project.name}</h3>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="text-gray-400 hover:text-gray-600"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
          
          {showMenu && (
            <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
              <div className="py-1">
                <button
                  onClick={() => {
                    onEdit(project)
                    setShowMenu(false)
                  }}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Edit className="w-4 h-4 mr-3" />
                  Edit Project
                </button>
                <button
                  onClick={() => {
                    onArchive(project)
                    setShowMenu(false)
                  }}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Archive className="w-4 h-4 mr-3" />
                  Archive
                </button>
                <button
                  onClick={() => {
                    onDelete(project)
                    setShowMenu(false)
                  }}
                  className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 mr-3" />
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {project.description && (
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">{project.description}</p>
      )}

      <div className="flex items-center justify-between mb-4">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[project.status]}`}>
          {statusLabels[project.status]}
        </span>
        
        {project.dueDate && (
          <div className="flex items-center text-gray-500 text-sm">
            <Calendar className="w-4 h-4 mr-1" />
            Due {project.dueDate.toLocaleDateString()}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Users className="w-4 h-4 text-gray-400" />
          <div className="flex -space-x-1">
            {project.members.slice(0, 3).map((member) => (
              <div
                key={member.id}
                className="w-6 h-6 bg-primary-600 rounded-full border-2 border-white flex items-center justify-center"
                title={member.name}
              >
                <span className="text-xs text-white font-medium">
                  {member.name.charAt(0)}
                </span>
              </div>
            ))}
            {project.members.length > 3 && (
              <div className="w-6 h-6 bg-gray-200 rounded-full border-2 border-white flex items-center justify-center">
                <span className="text-xs text-gray-600 font-medium">
                  +{project.members.length - 3}
                </span>
              </div>
            )}
          </div>
        </div>

        <Link 
          href={`/board?project=${project.id}`}
          className="text-primary-600 hover:text-primary-700 text-sm font-medium"
        >
          View Board
        </Link>
      </div>
    </div>
  )
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>(mockProjects)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showNewProjectModal, setShowNewProjectModal] = useState(false)

  const handleEdit = (project: Project) => {
    console.log('Edit project:', project.name)
    // This would open an edit modal in a real app
  }

  const handleArchive = (project: Project) => {
    setProjects(projects.map(p => 
      p.id === project.id ? { ...p, status: 'archived' as const } : p
    ))
  }

  const handleDelete = (project: Project) => {
    if (confirm(`Are you sure you want to delete "${project.name}"?`)) {
      setProjects(projects.filter(p => p.id !== project.id))
    }
  }

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter
    return matchesSearch && matchesStatus
  })

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
                <Link href="/projects" className="text-gray-900 hover:text-primary-600 px-3 py-2 text-sm font-medium">
                  Projects
                </Link>
                <Link href="/board" className="text-gray-500 hover:text-primary-600 px-3 py-2 text-sm font-medium">
                  Board
                </Link>
                <Link href="/team" className="text-gray-500 hover:text-primary-600 px-3 py-2 text-sm font-medium">
                  Team
                </Link>
              </nav>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Projects</h1>
            <p className="text-gray-600">Manage and organize your team's projects</p>
          </div>
          <button
            onClick={() => setShowNewProjectModal(true)}
            className="btn-primary"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </button>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="on_hold">On Hold</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onEdit={handleEdit}
              onArchive={handleArchive}
              onDelete={handleDelete}
            />
          ))}
        </div>

        {filteredProjects.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Search className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No projects found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria.'
                : 'Get started by creating your first project.'
              }
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <button
                onClick={() => setShowNewProjectModal(true)}
                className="btn-primary"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Project
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
