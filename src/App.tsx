import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { DashboardProvider } from './contexts/DashboardContext'
import Layout from './components/Layout'
import RoleProtectedRoute from './components/RoleProtectedRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Shows from './pages/Shows'
import Layouts from './pages/Layouts'
import Booking from './pages/Booking'
import Tickets from './pages/Tickets'
import Reports from './pages/Reports'
import Analytics from './pages/Analytics'
import Settings from './pages/Settings'
import Customers from './pages/Customers'
import CustomerDetail from './pages/CustomerDetail'
import CustomerReports from './pages/CustomerReports'
import StaffManagement from './pages/StaffManagement'

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return user ? <>{children}</> : <Navigate to="/login" />
}

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return user ? <Navigate to="/" /> : <>{children}</>
}

function App() {
  return (
    <AuthProvider>
      <DashboardProvider>
        <Router>
          <Routes>
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              {/* Admin-only routes */}
              <Route 
                index 
                element={
                  <RoleProtectedRoute allowedRoles={['admin']} fallbackPath="/shows">
                    <Dashboard />
                  </RoleProtectedRoute>
                } 
              />
              <Route 
                path="layouts" 
                element={
                  <RoleProtectedRoute allowedRoles={['admin']} fallbackPath="/shows">
                    <Layouts />
                  </RoleProtectedRoute>
                } 
              />
              <Route 
                path="customer-reports" 
                element={
                  <RoleProtectedRoute allowedRoles={['admin']} fallbackPath="/shows">
                    <CustomerReports />
                  </RoleProtectedRoute>
                } 
              />
              <Route 
                path="reports" 
                element={
                  <RoleProtectedRoute allowedRoles={['admin']} fallbackPath="/shows">
                    <Reports />
                  </RoleProtectedRoute>
                } 
              />
              <Route 
                path="analytics" 
                element={
                  <RoleProtectedRoute allowedRoles={['admin']} fallbackPath="/shows">
                    <Analytics />
                  </RoleProtectedRoute>
                } 
              />
              <Route 
                path="staff" 
                element={
                  <RoleProtectedRoute allowedRoles={['admin']} fallbackPath="/shows">
                    <StaffManagement />
                  </RoleProtectedRoute>
                } 
              />
              
              {/* Routes accessible by both admin and staff */}
              <Route path="shows" element={<Shows />} />
              <Route path="booking" element={<Booking />} />
              <Route path="tickets" element={<Tickets />} />
              <Route path="customers" element={<Customers />} />
              <Route path="customers/:customerId" element={<CustomerDetail />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Routes>
        </Router>
      </DashboardProvider>
    </AuthProvider>
  )
}

export default App