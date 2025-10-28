import React from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  HomeIcon,
  FilmIcon,
  TicketIcon,
  DocumentTextIcon,
  ArrowRightOnRectangleIcon,
  Squares2X2Icon,
  ChartBarIcon,
  Bars3Icon,
  XMarkIcon,
  BellIcon,
  SunIcon,
  MoonIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline'

const Layout: React.FC = () => {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = React.useState(false)
  const [signingOut, setSigningOut] = React.useState(false)
  // Initialize sidebar collapsed state from localStorage
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(() => {
    if (typeof window !== 'undefined') {
      const savedCollapsed = localStorage.getItem('sidebarCollapsed')
      return savedCollapsed ? JSON.parse(savedCollapsed) : false
    }
    return false
  })
  // Initialize dark mode from localStorage immediately (default: true)
  const [darkMode, setDarkMode] = React.useState(() => {
    if (typeof window !== 'undefined') {
      const savedDarkMode = localStorage.getItem('darkMode')
      return savedDarkMode ? JSON.parse(savedDarkMode) : true
    }
    return true
  })
  const [showProfile, setShowProfile] = React.useState(false)
  const [showNotifications, setShowNotifications] = React.useState(false)

  // Apply dark mode class to document immediately on mount
  React.useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [])

  // Save dark mode preference and apply to document when it changes
  React.useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode))
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  // Save sidebar collapsed state
  React.useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(sidebarCollapsed))
  }, [sidebarCollapsed])

  const handleSignOut = async () => {
    try {
      setSigningOut(true)
      setShowProfile(false) // Close the dropdown
      
      // Call Supabase signOut to destroy the session/token
      await signOut()
      
      // Navigate to login page
      window.location.href = '/login'
      
    } catch (error) {
      console.error('Error signing out:', error)
      
      // Even if there's an error, clear local storage and redirect
      localStorage.clear()
      window.location.href = '/login'
    } finally {
      setSigningOut(false)
    }
  }

  const navigation = [
    { name: 'Dashboard', href: '/', icon: HomeIcon },
    { name: 'Shows', href: '/shows', icon: FilmIcon },
    { name: 'Layouts', href: '/layouts', icon: Squares2X2Icon },
    { name: 'Book Seats', href: '/booking', icon: TicketIcon },
    { name: 'Ticket History', href: '/tickets', icon: DocumentTextIcon },
    { name: 'Reports', href: '/reports', icon: ChartBarIcon },
  ]

  return (
    <div className={`min-h-screen transition-colors duration-200 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setSidebarOpen(false)} />
          <div className={`fixed inset-y-0 left-0 w-72 sm:w-64 shadow-2xl transition-colors duration-200 ${darkMode ? 'bg-slate-900' : 'bg-white'}`}>
            {/* Mobile Header */}
            <div className={`flex h-16 items-center justify-between px-4 sm:px-6 border-b transition-colors duration-200 ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-slate-600 to-slate-800 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">K</span>
                </div>
                <h1 className={`text-lg font-medium transition-colors duration-200 ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                  Kalari
                </h1>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className={`p-2 rounded-lg transition-colors duration-200 touch-manipulation ${darkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Mobile Navigation */}
            <nav className="mt-8 px-4">
              <ul className="space-y-2">
                {navigation.map((item) => {
                  const isActive = location.pathname === item.href
                  return (
                    <li key={item.name}>
                      <Link
                        to={item.href}
                        onClick={() => setSidebarOpen(false)}
                        className={`flex items-center px-4 py-4 text-base font-medium rounded-xl transition-all duration-200 touch-manipulation ${isActive
                          ? darkMode
                            ? 'bg-slate-800 text-slate-100 shadow-sm border-l-4 border-slate-400'
                            : 'bg-slate-100 text-slate-900 shadow-sm border-l-4 border-slate-600'
                          : darkMode
                            ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                          }`}
                      >
                        <item.icon className="h-6 w-6 mr-4 flex-shrink-0" />
                        <span>{item.name}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </nav>

            {/* Mobile User Profile Section */}
            <div className={`absolute bottom-0 left-0 right-0 p-4 border-t transition-colors duration-200 ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <div className="w-10 h-10 bg-gradient-to-br from-slate-600 to-slate-800 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-medium text-base">
                      {user?.email?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className={`text-base font-medium transition-colors duration-200 ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>Admin</div>
                    <div className={`text-sm truncate transition-colors duration-200 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      {user?.email}
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className={`p-2 rounded-lg transition-colors duration-200 touch-manipulation ${
                    signingOut 
                      ? 'opacity-50 cursor-not-allowed' 
                      : darkMode 
                        ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' 
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                  }`}
                  title={signingOut ? "Signing Out..." : "Sign Out"}
                >
                  <ArrowRightOnRectangleIcon className="h-6 w-6" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className={`hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:block transition-all duration-300 ${sidebarCollapsed ? 'lg:w-16' : 'lg:w-64'} ${darkMode ? 'lg:bg-slate-900 lg:border-r lg:border-slate-800' : 'lg:bg-white lg:border-r lg:border-slate-200'}`}>
        {/* Desktop Header */}
        <div className={`flex h-16 items-center justify-between px-4 border-b transition-colors duration-200 ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-8 h-8 bg-gradient-to-br from-slate-600 to-slate-800 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">K</span>
            </div>
            {!sidebarCollapsed && (
              <h1 className={`text-lg font-medium transition-colors duration-200 truncate ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                Kalari
              </h1>
            )}
          </div>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={`p-1.5 rounded-lg transition-colors duration-200 ${darkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? (
              <ChevronRightIcon className="h-4 w-4" />
            ) : (
              <ChevronLeftIcon className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Desktop Navigation */}
        <nav className="mt-8 px-2">
          <ul className="space-y-2">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    className={`flex items-center ${sidebarCollapsed ? 'justify-center px-3 py-3' : 'px-4 py-3'} text-sm font-medium rounded-xl transition-all duration-200 group relative ${isActive
                      ? darkMode
                        ? 'bg-slate-800 text-slate-100 shadow-sm'
                        : 'bg-slate-100 text-slate-900 shadow-sm'
                      : darkMode
                        ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    title={sidebarCollapsed ? item.name : undefined}
                  >
                    <item.icon className={`h-5 w-5 flex-shrink-0 ${sidebarCollapsed ? '' : 'mr-3'}`} />
                    {!sidebarCollapsed && <span>{item.name}</span>}

                    {/* Tooltip for collapsed state */}
                    {sidebarCollapsed && (
                      <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                        {item.name}
                      </div>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Desktop User Profile Section */}
        <div className={`absolute bottom-0 left-0 right-0 p-4 border-t transition-colors duration-200 ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
          {sidebarCollapsed ? (
            <div className="flex flex-col items-center space-y-2">
              <div className="w-9 h-9 bg-gradient-to-br from-slate-600 to-slate-800 rounded-xl flex items-center justify-center group relative">
                <span className="text-white font-medium text-sm">
                  {user?.email?.charAt(0).toUpperCase()}
                </span>
                {/* Tooltip for collapsed state */}
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                  {user?.email}
                </div>
              </div>
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className={`p-2 rounded-lg transition-colors duration-200 group relative ${
                  signingOut 
                    ? 'opacity-50 cursor-not-allowed' 
                    : darkMode 
                      ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' 
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                }`}
                title={signingOut ? "Signing Out..." : "Sign Out"}
              >
                <ArrowRightOnRectangleIcon className="h-4 w-4" />
                {/* Tooltip for collapsed state */}
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                  Sign Out
                </div>
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="min-w-0 flex-1">
                  <div className={`text-sm font-medium transition-colors duration-200 ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>Admin</div>
                  <div className={`text-xs truncate transition-colors duration-200 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {user?.email}
                  </div>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className={`p-2 rounded-lg transition-colors duration-200 ${
                  signingOut 
                    ? 'opacity-50 cursor-not-allowed' 
                    : darkMode 
                      ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' 
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                }`}
                title={signingOut ? "Signing Out..." : "Sign Out"}
              >
                <ArrowRightOnRectangleIcon className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Header */}
      <div className={`lg:hidden border-b px-4 py-4 transition-colors duration-200 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className={`p-2 rounded-lg transition-colors duration-200 touch-manipulation ${darkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
          >
            <Bars3Icon className="h-6 w-6" />
          </button>
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 bg-gradient-to-br from-slate-600 to-slate-800 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">K</span>
            </div>
            <h1 className={`text-lg font-medium transition-colors duration-200 ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
              Kalari
            </h1>
          </div>
          <div className="w-10" /> {/* Spacer for centering */}
        </div>
      </div>

      {/* Header - All Pages */}
      <div className={`sticky top-0 lg:top-0 z-40 transition-all duration-300 py-2 sm:py-4 px-0 ${sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-72'} ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className={`mx-2 sm:mx-4 rounded-2xl shadow-sm border px-4 sm:px-6 py-3 sm:py-4 transition-colors duration-200 backdrop-blur-sm ${darkMode ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-slate-200'}`}>
          <div className="flex items-center justify-between">
            {/* Left - Logo */}
            <div className="flex items-center space-x-3 min-w-0 flex-1">

              <div className="min-w-0">
                <h1 className={`text-lg font-medium transition-colors duration-200 truncate ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                  <span className="hidden sm:inline">Kalari Booking Dashboard</span>
                  <span className="sm:hidden">Kalari Booking</span>
                </h1>
              </div>
            </div>

            {/* Right - Actions */}
            <div className="flex items-center space-x-2 flex-shrink-0">
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className={`p-2 rounded-xl relative transition-colors duration-200 ${darkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
                >
                  <BellIcon className="h-5 w-5" />
                </button>

                {/* Notifications Panel - Desktop */}
                {showNotifications && (
                  <>
                    {/* Mobile Modal */}
                    <div 
                      className="sm:hidden fixed top-16 left-0 right-0 bottom-0 z-50 flex items-start justify-center p-4 pt-8"
                      onClick={() => setShowNotifications(false)}
                    >
                      <div 
                        className={`w-full max-w-sm mx-auto rounded-2xl shadow-xl border backdrop-blur-xl transition-all duration-200 ${darkMode ? 'bg-slate-900/95 border-slate-700/50' : 'bg-white/95 border-slate-200/50'}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Header */}
                        <div className={`flex items-center justify-between p-4 border-b ${darkMode ? 'border-slate-700/50' : 'border-slate-200/50'}`}>
                          <h3 className={`text-lg font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                            Notifications
                          </h3>
                          <button
                            onClick={() => setShowNotifications(false)}
                            className={`p-1 rounded-lg transition-colors duration-200 ${darkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Content */}
                        <div className="p-4">
                          <div className="flex flex-col items-center justify-center py-6 space-y-4">
                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                              <BellIcon className={`w-8 h-8 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} />
                            </div>
                            <div className="text-center">
                              <h4 className={`text-lg font-medium mb-2 ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                                This feature coming soon...
                              </h4>
                              <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                We're working on bringing you real-time notifications for bookings, shows, and more.
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Footer */}
                        <div className={`p-4 border-t ${darkMode ? 'border-slate-700/50' : 'border-slate-200/50'}`}>
                          <button
                            className={`w-full py-2 px-4 rounded-xl text-sm font-medium transition-colors duration-200 ${darkMode ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                            onClick={() => setShowNotifications(false)}
                          >
                            Close
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Desktop Dropdown */}
                    <div className="hidden sm:block absolute right-0 mt-2 w-80 rounded-2xl shadow-xl border backdrop-blur-xl z-50 transition-all duration-200 bg-white/95 border-slate-200/50 dark:bg-slate-900/95 dark:border-slate-700/50">
                      {/* Header */}
                      <div className={`flex items-center justify-between p-4 border-b ${darkMode ? 'border-slate-700/50' : 'border-slate-200/50'}`}>
                        <h3 className={`text-lg font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                          Notifications
                        </h3>
                        <button
                          onClick={() => setShowNotifications(false)}
                          className={`p-1 rounded-lg transition-colors duration-200 ${darkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Content */}
                      <div className="p-6">
                        <div className="flex flex-col items-center justify-center py-8 space-y-4">
                          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                            <BellIcon className={`w-8 h-8 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} />
                          </div>
                          <div className="text-center">
                            <h4 className={`text-lg font-medium mb-2 ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                              This feature coming soon...
                            </h4>
                            <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                              We're working on bringing you real-time notifications for bookings, shows, and more.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Footer */}
                      <div className={`p-4 border-t ${darkMode ? 'border-slate-700/50' : 'border-slate-200/50'}`}>
                        <button
                          className={`w-full py-2 px-4 rounded-xl text-sm font-medium transition-colors duration-200 ${darkMode ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                          onClick={() => setShowNotifications(false)}
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded-xl transition-colors duration-200 ${darkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
              >
                {darkMode ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowProfile(!showProfile)}
                  className={`flex items-center space-x-2 p-2 rounded-xl transition-colors duration-200 ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}
                >
                  <div className="w-7 h-7 bg-gradient-to-br from-slate-600 to-slate-800 rounded-xl flex items-center justify-center">
                    <span className="text-white font-medium text-xs">A</span>
                  </div>
                  <ChevronDownIcon className="h-3 w-3 text-slate-500 hidden sm:block" />
                </button>

                {showProfile && (
                  <div className={`absolute right-0 mt-2 w-36 rounded-xl shadow-lg border py-2 z-[60] pointer-events-auto transition-colors duration-200 backdrop-blur-sm ${darkMode ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-slate-200'}`}>
                    <button
                      onClick={handleSignOut}
                      disabled={signingOut}
                      className={`block w-full text-left px-4 py-3 text-sm font-medium transition-colors duration-200 ${
                        signingOut 
                          ? 'opacity-50 cursor-not-allowed' 
                          : darkMode 
                            ? 'text-slate-300 hover:bg-slate-800' 
                            : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {signingOut ? 'Signing Out...' : 'Sign Out'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-72'}`}>
        <main className="p-3 sm:p-4 lg:p-6 min-h-screen">
          <Outlet />
        </main>
      </div>

      {/* Click outside to close dropdowns */}
      {showProfile && (
        <div
          className="fixed inset-0 z-30 pointer-events-auto"
          onClick={() => setShowProfile(false)}
        ></div>
      )}
      {showNotifications && (
        <div
          className="hidden sm:block fixed inset-0 z-40"
          onClick={() => setShowNotifications(false)}
        ></div>
      )}
    </div>
  )
}

export default Layout