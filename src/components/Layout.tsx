import React from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  HomeIcon,
  FilmIcon,
  TicketIcon,
  DocumentTextIcon,
  CogIcon,
  ArrowRightOnRectangleIcon,
  Squares2X2Icon,
  ChartBarIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline'

const Layout: React.FC = () => {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = React.useState(false)

  const navigation = [
    { name: 'Dashboard', href: '/', icon: HomeIcon },
    { name: 'Shows', href: '/shows', icon: FilmIcon },
    { name: 'Layouts', href: '/layouts', icon: Squares2X2Icon },
    { name: 'Book Seats', href: '/booking', icon: TicketIcon },
    { name: 'Ticket History', href: '/tickets', icon: DocumentTextIcon },
    { name: 'Reports', href: '/reports', icon: ChartBarIcon },
    { name: 'Settings', href: '/settings', icon: CogIcon },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-xl">
            {/* Mobile Header */}
            <div className="flex h-16 items-center justify-between px-6 border-b border-gray-200">
              <h1 className="text-lg font-semibold text-gray-900">
                Kalary Booking
              </h1>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Mobile Navigation */}
            <nav className="mt-6 px-3">
              <ul className="space-y-1">
                {navigation.map((item) => {
                  const isActive = location.pathname === item.href
                  return (
                    <li key={item.name}>
                      <Link
                        to={item.href}
                        onClick={() => setSidebarOpen(false)}
                        className={`flex items-center px-3 py-3 text-sm font-medium rounded-md transition-colors ${isActive
                            ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                      >
                        <item.icon className="h-5 w-5 mr-3" />
                        <span>{item.name}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </nav>

            {/* Mobile User Profile Section */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-medium text-sm">
                      {user?.email?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-gray-900">Admin</div>
                    <div className="text-xs text-gray-500 truncate">
                      {user?.email}
                    </div>
                  </div>
                </div>
                <button
                  onClick={signOut}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded"
                  title="Sign Out"
                >
                  <ArrowRightOnRectangleIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:block lg:w-64 lg:bg-white lg:shadow-sm lg:border-r lg:border-gray-200">
        {/* Desktop Header */}
        <div className="flex h-16 items-center px-6 border-b border-gray-200">
          <h1 className="text-lg font-semibold text-gray-900">
            Kalary Booking
          </h1>
        </div>

        {/* Desktop Navigation */}
        <nav className="mt-6 px-3">
          <ul className="space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${isActive
                        ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                  >
                    <item.icon className="h-5 w-5 mr-3" />
                    <span>{item.name}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Desktop User Profile Section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white font-medium text-sm">
                  {user?.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-gray-900">Admin</div>
                <div className="text-xs text-gray-500 truncate">
                  {user?.email}
                </div>
              </div>
            </div>
            <button
              onClick={signOut}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
              title="Sign Out"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 text-gray-400 hover:text-gray-600"
          >
            <Bars3Icon className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">
            Kalary Booking
          </h1>
          <div className="w-10" /> {/* Spacer for centering */}
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        <main className="p-4 lg:p-6 min-h-screen">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default Layout