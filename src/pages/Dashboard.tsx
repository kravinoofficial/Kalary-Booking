import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { 
  CalendarDaysIcon, 
  CurrencyDollarIcon,
  TicketIcon 
} from '@heroicons/react/24/outline'

interface DashboardStats {
  upcomingShows: number
  totalSeatsBooked: number
  totalRevenue: number
  todayBookings: number
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    upcomingShows: 0,
    totalSeatsBooked: 0,
    totalRevenue: 0,
    todayBookings: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardStats()
  }, [])

  const fetchDashboardStats = async () => {
    try {
      // Get upcoming shows count
      const { count: upcomingShows } = await supabase
        .from('shows')
        .select('*', { count: 'exact', head: true })
        .eq('active', true)
        .gte('date', new Date().toISOString().split('T')[0])

      // Get total bookings and revenue
      const { data: bookings } = await supabase
        .from('bookings')
        .select('*')
        .eq('status', 'CONFIRMED')

      // Get today's bookings
      const today = new Date().toISOString().split('T')[0]
      const { count: todayBookings } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'CONFIRMED')
        .gte('booking_time', today)

      // Get total revenue from tickets
      const { data: tickets } = await supabase
        .from('tickets')
        .select('price')
        .eq('status', 'ACTIVE')

      const totalRevenue = tickets?.reduce((sum, ticket) => sum + ticket.price, 0) || 0

      setStats({
        upcomingShows: upcomingShows || 0,
        totalSeatsBooked: bookings?.length || 0,
        totalRevenue,
        todayBookings: todayBookings || 0
      })
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    {
      title: 'Upcoming Shows',
      value: stats.upcomingShows,
      icon: CalendarDaysIcon,
      color: 'bg-blue-500',
    },
    {
      title: 'Total Seats Booked',
      value: stats.totalSeatsBooked,
      icon: TicketIcon,
      color: 'bg-green-500',
    },
    {
      title: 'Total Revenue',
      value: `₹${stats.totalRevenue.toLocaleString()}`,
      icon: CurrencyDollarIcon,
      color: 'bg-yellow-500',
    },
    {
      title: "Today's Bookings",
      value: stats.todayBookings,
      icon: TicketIcon,
      color: 'bg-purple-500',
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome to Kalary Seat Booking System</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card, index) => (
          <div key={index} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className={`${card.color} p-3 rounded-xl`}>
                <card.icon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{card.title}</p>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <a
              href="/shows"
              className="flex items-center p-4 bg-primary-50 rounded-xl hover:bg-primary-100 transition-colors"
            >
              <CalendarDaysIcon className="h-5 w-5 text-primary-600 mr-3" />
              <span className="font-medium text-primary-700">Manage Shows</span>
            </a>
            <a
              href="/booking"
              className="flex items-center p-4 bg-green-50 rounded-xl hover:bg-green-100 transition-colors"
            >
              <TicketIcon className="h-5 w-5 text-green-600 mr-3" />
              <span className="font-medium text-green-700">Book Seats</span>
            </a>
            <a
              href="/layouts"
              className="flex items-center p-4 bg-yellow-50 rounded-xl hover:bg-yellow-100 transition-colors"
            >
              <CalendarDaysIcon className="h-5 w-5 text-yellow-600 mr-3" />
              <span className="font-medium text-yellow-700">Design Layout</span>
            </a>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="text-center py-8 text-gray-500">
            <TicketIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No recent activity</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard