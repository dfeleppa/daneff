'use client'

import Link from 'next/link'
import { Plus, Search, Bell, Settings, User, LogOut } from 'lucide-react'
import { useSession, signOut } from 'next-auth/react'
import { useState } from 'react'

interface HeaderProps {
  currentPage?: string
}

export function Header({ currentPage }: HeaderProps) {
  const { data: session } = useSession()
  const [showUserMenu, setShowUserMenu] = useState(false)

  const handleSignOut = () => {
    signOut({ callbackUrl: '/auth/signin' })
  }

  const isActive = (page: string) => currentPage === page

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/" className="text-2xl font-bold text-primary-600 mr-8">
              TaskFlow
            </Link>
            <nav className="hidden md:flex md:space-x-8">
              <Link 
                href="/" 
                className={`px-3 py-2 text-sm font-medium ${
                  isActive('dashboard') 
                    ? 'text-gray-900 hover:text-primary-600' 
                    : 'text-gray-500 hover:text-primary-600'
                }`}
              >
                Dashboard
              </Link>
              <Link 
                href="/projects" 
                className={`px-3 py-2 text-sm font-medium ${
                  isActive('projects') 
                    ? 'text-gray-900 hover:text-primary-600' 
                    : 'text-gray-500 hover:text-primary-600'
                }`}
              >
                Projects
              </Link>
              <Link 
                href="/board" 
                className={`px-3 py-2 text-sm font-medium ${
                  isActive('board') 
                    ? 'text-gray-900 hover:text-primary-600' 
                    : 'text-gray-500 hover:text-primary-600'
                }`}
              >
                Board
              </Link>
              <Link 
                href="/team" 
                className={`px-3 py-2 text-sm font-medium ${
                  isActive('team') 
                    ? 'text-gray-900 hover:text-primary-600' 
                    : 'text-gray-500 hover:text-primary-600'
                }`}
              >
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
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 border">
                  <div className="px-4 py-2 text-sm text-gray-700 border-b">
                    <p className="font-medium">{session?.user?.name}</p>
                    <p className="text-gray-500 text-xs">{session?.user?.email}</p>
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
  )
}
