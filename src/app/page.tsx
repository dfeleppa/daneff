'use client'

import Link from 'next/link'
import { Plus, Search, Bell, Settings, User, LogOut } from 'lucide-react'
import { useSession, signOut } from 'next-auth/react'
import { useState } from 'react'

export default function Home() {
  const { data: session, status } = useSession()
  const [showUserMenu, setShowUserMenu] = useState(false)

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  const handleSignOut = () => {
    signOut({ callbackUrl: '/auth/signin' })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-primary-600">TaskFlow</h1>
              <nav className="hidden md:ml-6 md:flex md:space-x-8">
                <Link href="/dashboard" className="text-gray-900 hover:text-primary-600 px-3 py-2 text-sm font-medium">
                  Dashboard
                </Link>
                <Link href="/projects" className="text-gray-500 hover:text-primary-600 px-3 py-2 text-sm font-medium">
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
            
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search tasks, projects..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <button className="btn-primary">
                <Plus className="w-4 h-4 mr-2" />
                New Task
              </button>
              <Bell className="w-5 h-5 text-gray-400 hover:text-gray-600 cursor-pointer" />
              <Settings className="w-5 h-5 text-gray-400 hover:text-gray-600 cursor-pointer" />
              
              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  {session?.user?.image ? (
                    <img
                      className="w-8 h-8 rounded-full"
                      src={session.user.image}
                      alt={session.user.name || 'User'}
                    />
                  ) : (
                    <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                  )}
                </button>
                
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
                    <div className="px-4 py-2 text-sm text-gray-700 border-b">
                      <p className="font-medium">{session?.user?.name}</p>
                      <p className="text-gray-500">{session?.user?.email}</p>
                    </div>
                    <button
                      onClick={handleSignOut}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <LogOut className="w-4 h-4 mr-3" />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {session?.user?.name?.split(' ')[0] || 'User'}!
          </h2>
          <p className="text-gray-600">Here's what's happening with your projects today.</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Total Tasks</h3>
            <p className="text-2xl font-bold text-gray-900">24</p>
            <p className="text-sm text-green-600 mt-1">+3 from yesterday</p>
          </div>
          <div className="card">
            <h3 className="text-sm font-medium text-gray-500 mb-2">In Progress</h3>
            <p className="text-2xl font-bold text-gray-900">8</p>
            <p className="text-sm text-blue-600 mt-1">2 due today</p>
          </div>
          <div className="card">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Completed</h3>
            <p className="text-2xl font-bold text-gray-900">16</p>
            <p className="text-sm text-green-600 mt-1">67% completion rate</p>
          </div>
          <div className="card">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Team Members</h3>
            <p className="text-2xl font-bold text-gray-900">5</p>
            <p className="text-sm text-gray-500 mt-1">All active</p>
          </div>
        </div>

        {/* Recent Projects */}
        <div className="card mb-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Recent Projects</h3>
            <Link href="/projects" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
              View all
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((project) => (
              <div key={project} className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 transition-colors cursor-pointer">
                <h4 className="font-medium text-gray-900 mb-2">Project {project}</h4>
                <p className="text-sm text-gray-600 mb-3">Lorem ipsum dolor sit amet consectetur...</p>
                <div className="flex items-center justify-between">
                  <div className="flex -space-x-2">
                    {[1, 2, 3].map((avatar) => (
                      <div key={avatar} className="w-6 h-6 bg-primary-600 rounded-full border-2 border-white flex items-center justify-center">
                        <span className="text-xs text-white font-medium">{avatar}</span>
                      </div>
                    ))}
                  </div>
                  <span className="text-xs text-gray-500">5 tasks</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/tasks/new" className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:border-primary-300 transition-colors">
              <Plus className="w-8 h-8 text-primary-600 mb-2" />
              <span className="text-sm font-medium text-gray-900">Create Task</span>
            </Link>
            <Link href="/projects/new" className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:border-primary-300 transition-colors">
              <Plus className="w-8 h-8 text-primary-600 mb-2" />
              <span className="text-sm font-medium text-gray-900">New Project</span>
            </Link>
            <Link href="/team/invite" className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:border-primary-300 transition-colors">
              <User className="w-8 h-8 text-primary-600 mb-2" />
              <span className="text-sm font-medium text-gray-900">Invite Team</span>
            </Link>
            <Link href="/reports" className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:border-primary-300 transition-colors">
              <Settings className="w-8 h-8 text-primary-600 mb-2" />
              <span className="text-sm font-medium text-gray-900">View Reports</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
