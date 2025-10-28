import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { differenceInDays, differenceInHours, differenceInMinutes, subWeeks, subMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from 'date-fns'
import {
  CurrencyDollarIcon,
  TicketIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
  UserIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'
import { useDarkMode } from '../hooks/useDarkMode'

interface DashboardMetrics {
  totalRevenue: number
  todayRevenue: number
  weekRevenue: number
  monthRevenue: number
  todayBookings: number
  weeklyGrowth: number
  monthlyGrowth: number
  lastWeekRevenue: number
  lastMonthRevenue: number
}

interface UpcomingEvent {
  id: string
  name: string
  date: string
  time: string
  booked: number
  capacity: number
  countdown: string
}

interface TopEvent {
  name: string
  revenue: number
  tickets: number
  avgPrice: number
}

interface ActivityLog {
  id: string
  action: string
  entity_type: string
  entity_id: string | null
  entity_name: string | null
  details: any
  performed_by: string
  performed_at: string
  ip_address: string | null
  user_agent: string | null
}





const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const darkMode = useDarkMode()

  // Real data states
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalRevenue: 0,
    todayRevenue: 0,
    weekRevenue: 0,
    monthRevenue: 0,
    todayBookings: 0,
    weeklyGrowth: 0,
    monthlyGrowth: 0,
    lastWeekRevenue: 0,
    lastMonthRevenue: 0
  })

  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([])
  const [topEvents, setTopEvents] = useState<TopEvent[]>([])
  const [dailyRevenue, setDailyRevenue] = useState<number[]>([])
  const [weeklyTickets, setWeeklyTickets] = useState<number[]>([])
  const [monthlyTickets, setMonthlyTickets] = useState(0)
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([])
  const [logsLoading, setLogsLoading] = useState(false)


  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      await Promise.all([
        fetchMetrics(),
        fetchUpcomingEvents(),
        fetchTopEvents(),
        fetchDailyData(),
        fetchActivityLogs()
      ])
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMetrics = async () => {
    try {
      const now = new Date()
      const today = now.toISOString().split('T')[0]

      // Date ranges
      const thisWeekStart = startOfWeek(now).toISOString()
      const thisWeekEnd = endOfWeek(now).toISOString()
      const lastWeekStart = startOfWeek(subWeeks(now, 1)).toISOString()
      const lastWeekEnd = endOfWeek(subWeeks(now, 1)).toISOString()

      const thisMonthStart = startOfMonth(now).toISOString()
      const thisMonthEnd = endOfMonth(now).toISOString()
      const lastMonthStart = startOfMonth(subMonths(now, 1)).toISOString()
      const lastMonthEnd = endOfMonth(subMonths(now, 1)).toISOString()

      // Get all tickets with dates
      const { data: allTickets } = await supabase
        .from('tickets')
        .select('price, generated_at')
        .eq('status', 'ACTIVE')

      if (!allTickets) return

      // Calculate total revenue
      const totalRevenue = allTickets.reduce((sum, ticket) => sum + ticket.price, 0)

      // Today's data
      const todayTickets = allTickets.filter(ticket =>
        ticket.generated_at.startsWith(today)
      )
      const todayRevenue = todayTickets.reduce((sum, ticket) => sum + ticket.price, 0)

      // This week's data
      const thisWeekTickets = allTickets.filter(ticket =>
        ticket.generated_at >= thisWeekStart && ticket.generated_at <= thisWeekEnd
      )
      const weekRevenue = thisWeekTickets.reduce((sum, ticket) => sum + ticket.price, 0)

      // Last week's data
      const lastWeekTickets = allTickets.filter(ticket =>
        ticket.generated_at >= lastWeekStart && ticket.generated_at <= lastWeekEnd
      )
      const lastWeekRevenue = lastWeekTickets.reduce((sum, ticket) => sum + ticket.price, 0)

      // This month's data
      const thisMonthTickets = allTickets.filter(ticket =>
        ticket.generated_at >= thisMonthStart && ticket.generated_at <= thisMonthEnd
      )
      const monthRevenue = thisMonthTickets.reduce((sum, ticket) => sum + ticket.price, 0)

      // Last month's data
      const lastMonthTickets = allTickets.filter(ticket =>
        ticket.generated_at >= lastMonthStart && ticket.generated_at <= lastMonthEnd
      )
      const lastMonthRevenue = lastMonthTickets.reduce((sum, ticket) => sum + ticket.price, 0)

      // Calculate growth percentages
      const weeklyGrowth = lastWeekRevenue > 0 ? ((weekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100 : 0
      const monthlyGrowth = lastMonthRevenue > 0 ? ((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0

      setMetrics({
        totalRevenue,
        todayRevenue,
        weekRevenue,
        monthRevenue,
        todayBookings: todayTickets.length,
        weeklyGrowth,
        monthlyGrowth,
        lastWeekRevenue,
        lastMonthRevenue
      })
    } catch (error) {
      console.error('Error fetching metrics:', error)
    }
  }

  const fetchUpcomingEvents = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]

      // Get upcoming shows
      const { data: shows } = await supabase
        .from('shows')
        .select(`
          *,
          layout:layouts(structure)
        `)
        .eq('active', true)
        .gte('date', today)
        .order('date')
        .limit(3)

      if (!shows) return

      const events: UpcomingEvent[] = []

      for (const show of shows) {
        // Calculate total capacity
        let capacity = 0
        if (show.layout?.structure?.sections) {
          show.layout.structure.sections.forEach((section: any) => {
            capacity += section.rows * section.seatsPerRow
          })
        }

        // Get bookings for this show
        const { data: bookings } = await supabase
          .from('bookings')
          .select('seat_code')
          .eq('show_id', show.id)
          .eq('status', 'CONFIRMED')

        // Count booked seats
        let booked = 0
        bookings?.forEach(booking => {
          try {
            const seats = JSON.parse(booking.seat_code)
            booked += Array.isArray(seats) ? seats.length : 1
          } catch {
            booked += booking.seat_code.includes(',')
              ? booking.seat_code.split(',').length
              : 1
          }
        })

        // Calculate countdown
        const showDateTime = new Date(`${show.date}T${show.time}`)
        const now = new Date()
        const countdown = getCountdown(showDateTime, now)

        events.push({
          id: show.id,
          name: show.title,
          date: show.date,
          time: show.time,
          booked,
          capacity,
          countdown
        })
      }

      setUpcomingEvents(events)
    } catch (error) {
      console.error('Error fetching upcoming events:', error)
    }
  }

  const fetchTopEvents = async () => {
    try {
      // Get all shows with their revenue
      const { data: shows } = await supabase
        .from('shows')
        .select('id, title, price')

      if (!shows) return

      const eventStats: TopEvent[] = []

      for (const show of shows) {
        // Get tickets for this show
        const { data: tickets } = await supabase
          .from('tickets')
          .select('price')
          .eq('show_id', show.id)
          .eq('status', 'ACTIVE')

        if (tickets && tickets.length > 0) {
          const revenue = tickets.reduce((sum, ticket) => sum + ticket.price, 0)
          const ticketCount = tickets.length
          const avgPrice = revenue / ticketCount

          eventStats.push({
            name: show.title,
            revenue,
            tickets: ticketCount,
            avgPrice
          })
        }
      }

      // Sort by revenue and take top 3
      eventStats.sort((a, b) => b.revenue - a.revenue)
      setTopEvents(eventStats.slice(0, 3))
    } catch (error) {
      console.error('Error fetching top events:', error)
    }
  }

  const fetchDailyData = async () => {
    try {
      const { data: tickets } = await supabase
        .from('tickets')
        .select('price, generated_at')
        .eq('status', 'ACTIVE')
        .order('generated_at')

      if (!tickets) return

      const now = new Date()
      const thisMonthStart = startOfMonth(now).toISOString()
      const thisMonthEnd = endOfMonth(now).toISOString()

      // Get last 7 days of data
      const revenueArray: number[] = []
      const ticketsArray: number[] = []

      for (let i = 6; i >= 0; i--) {
        const date = subDays(new Date(), i)
        const dateStr = date.toISOString().split('T')[0]

        const dayTickets = tickets.filter(ticket =>
          ticket.generated_at.startsWith(dateStr)
        )

        const dayRevenue = dayTickets.reduce((sum, ticket) => sum + ticket.price, 0)

        revenueArray.push(dayRevenue)
        ticketsArray.push(dayTickets.length)
      }

      // Calculate actual monthly tickets
      const monthlyTicketsData = tickets.filter(ticket =>
        ticket.generated_at >= thisMonthStart && ticket.generated_at <= thisMonthEnd
      )

      setDailyRevenue(revenueArray)
      setWeeklyTickets(ticketsArray)
      setMonthlyTickets(monthlyTicketsData.length)
    } catch (error) {
      console.error('Error fetching daily data:', error)
    }
  }



  const fetchActivityLogs = async () => {
    try {
      setLogsLoading(true)
      const { data: logs } = await supabase
        .from('activity_logs')
        .select('*')
        .order('performed_at', { ascending: false })
        .limit(50)

      if (logs) {
        setActivityLogs(logs)
      }
    } catch (error) {
      console.error('Error fetching activity logs:', error)
    } finally {
      setLogsLoading(false)
    }
  }

  const getCountdown = (showDateTime: Date, now: Date) => {
    if (showDateTime < now) {
      return 'Started'
    }

    const days = differenceInDays(showDateTime, now)
    const hours = differenceInHours(showDateTime, now) % 24
    const minutes = differenceInMinutes(showDateTime, now) % 60

    if (days > 0) {
      return `${days}d ${hours}h`
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`
    } else {
      return `${minutes}m`
    }
  }

  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create':
      case 'booking':
        return <DocumentTextIcon className="h-4 w-4 text-green-600" />
      case 'update':
        return <ClockIcon className="h-4 w-4 text-blue-600" />
      case 'delete':
      case 'cancellation':
        return <UserIcon className="h-4 w-4 text-red-600" />
      default:
        return <DocumentTextIcon className="h-4 w-4 text-gray-600" />
    }
  }

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create':
      case 'booking':
        return 'text-green-600 bg-green-50'
      case 'update':
        return 'text-blue-600 bg-blue-50'
      case 'delete':
      case 'cancellation':
        return 'text-red-600 bg-red-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const formatLogDetails = (log: ActivityLog) => {
    const details = log.details || {}
    switch (log.action.toLowerCase()) {
      case 'booking':
        return `Booked ${details.seat_count || 1} seat(s) for ₹${details.total_price || 0}`
      case 'create':
        if (log.entity_type === 'SHOW') {
          return `Created show "${log.entity_name}" on ${details.date} at ${details.time}`
        }
        return `Created ${log.entity_type.toLowerCase()}: ${log.entity_name}`
      case 'update':
        return `Updated ${log.entity_type.toLowerCase()}: ${log.entity_name}`
      case 'delete':
        return `Deleted ${log.entity_type.toLowerCase()}: ${log.entity_name}`
      case 'cancellation':
        return `Cancelled booking for ${details.seat_count || 1} seat(s)`
      default:
        return `${log.action} ${log.entity_type.toLowerCase()}: ${log.entity_name || 'Unknown'}`
    }
  }

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center transition-colors duration-200 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className={`transition-colors duration-200 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Row 1 - Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Revenue */}
        <div className={`rounded-2xl p-6 shadow-sm border transition-colors duration-200 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 rounded-xl">
              <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="flex items-center text-green-600 text-sm font-medium">
              <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
              +{metrics.weeklyGrowth}%
            </div>
          </div>
          <div>
            <h3 className={`text-sm font-medium mb-1 transition-colors duration-200 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Revenue</h3>
            <p className={`text-2xl font-bold transition-colors duration-200 ${darkMode ? 'text-white' : 'text-gray-900'}`}>₹{metrics.totalRevenue.toLocaleString()}</p>
            <p className={`text-xs mt-1 transition-colors duration-200 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>Compared to last month: +8.5%</p>
          </div>
          {/* Mini line chart */}
          <div className="mt-4 h-8 flex items-end space-x-1">
            {[40, 60, 45, 80, 65, 90, 75].map((height, i) => (
              <div key={i} className="flex-1 bg-green-200 rounded-sm" style={{ height: `${height}%` }}></div>
            ))}
          </div>
        </div>

        {/* Today's Revenue */}
        <div className={`rounded-2xl p-6 shadow-sm border transition-colors duration-200 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 rounded-xl">
              <ChartBarIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="text-right">
              <div className={`text-xs transition-colors duration-200 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>Today</div>
              <div className={`text-sm font-medium transition-colors duration-200 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{new Date().toLocaleDateString()}</div>
            </div>
          </div>
          <div>
            <h3 className={`text-sm font-medium mb-1 transition-colors duration-200 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Today's Revenue</h3>
            <p className={`text-2xl font-bold transition-colors duration-200 ${darkMode ? 'text-white' : 'text-gray-900'}`}>₹{metrics.todayRevenue.toLocaleString()}</p>
            <p className={`text-xs mt-1 transition-colors duration-200 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>Bookings: {metrics.todayBookings} tickets</p>
          </div>
          {/* Mini bar chart */}
          <div className="mt-4 h-8 flex items-end justify-end space-x-1">
            {[30, 50, 40, 70, 60, 45].map((height, i) => (
              <div key={i} className="w-2 bg-blue-200 rounded-sm" style={{ height: `${height}%` }}></div>
            ))}
          </div>
        </div>

        {/* This Week's Revenue */}
        <div className={`rounded-2xl p-6 shadow-sm border transition-colors duration-200 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 rounded-xl">
              <CalendarDaysIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div className="text-right">
              <div className={`text-xs transition-colors duration-200 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>This Week</div>
              <div className={`text-sm font-medium transition-colors duration-200 ${darkMode ? 'text-white' : 'text-gray-900'}`}>7 Days</div>
            </div>
          </div>
          <div>
            <h3 className={`text-sm font-medium mb-1 transition-colors duration-200 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>This Week's Revenue</h3>
            <p className={`text-2xl font-bold transition-colors duration-200 ${darkMode ? 'text-white' : 'text-gray-900'}`}>₹{metrics.weekRevenue.toLocaleString()}</p>
          </div>
          {/* 7-day mini line chart */}
          <div className="mt-4 h-8 flex items-end space-x-1">
            {dailyRevenue.map((value, i) => {
              const height = (value / Math.max(...dailyRevenue)) * 100
              return <div key={i} className="flex-1 bg-purple-200 rounded-sm" style={{ height: `${height}%` }}></div>
            })}
          </div>
        </div>

        {/* This Month's Revenue */}
        <div className={`rounded-2xl p-6 shadow-sm border transition-colors duration-200 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-orange-100 rounded-xl">
              <TicketIcon className="h-6 w-6 text-orange-600" />
            </div>
            <div className="text-right">
              <div className={`text-xs transition-colors duration-200 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>This Month</div>
              <div className={`text-sm font-medium transition-colors duration-200 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{new Date().toLocaleDateString('en-US', { month: 'short' })}</div>
            </div>
          </div>
          <div>
            <h3 className={`text-sm font-medium mb-1 transition-colors duration-200 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>This Month's Revenue</h3>
            <p className={`text-2xl font-bold transition-colors duration-200 ${darkMode ? 'text-white' : 'text-gray-900'}`}>₹{metrics.monthRevenue.toLocaleString()}</p>
          </div>
          {/* Mini pie chart representation */}
          <div className="mt-4 flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-orange-400 to-red-500 flex items-center justify-center">
              <span className="text-white text-xs font-bold">85%</span>
            </div>
            <div className={`text-xs transition-colors duration-200 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>Event categories</div>
          </div>
        </div>
      </div>

      {/* Row 2 - Upcoming Events */}
      <div className="grid grid-cols-1 gap-6">
        {/* Upcoming Events Countdown */}
        <div className={`rounded-2xl p-6 shadow-sm border transition-colors duration-200 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h3 className={`text-lg font-semibold mb-6 transition-colors duration-200 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Upcoming Events Countdown</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {upcomingEvents.map((event, i) => {
              const progress = (event.booked / event.capacity) * 100
              return (
                <div key={i} className={`border rounded-xl p-4 transition-colors duration-200 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className={`font-medium transition-colors duration-200 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{event.name}</h4>
                    <span className="text-sm font-medium text-orange-600">{event.countdown}</span>
                  </div>
                  <div className={`flex items-center text-sm mb-3 transition-colors duration-200 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    <CalendarDaysIcon className="h-4 w-4 mr-1" />
                    {new Date(event.date).toLocaleDateString()} at {event.time}
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm transition-colors duration-200 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Bookings</span>
                    <span className={`text-sm font-medium transition-colors duration-200 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{event.booked}/{event.capacity} tickets</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${progress >= 80 ? 'bg-red-500' : progress >= 60 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Row 3 - Revenue Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly vs Monthly Comparison */}
        <div className={`rounded-2xl p-6 shadow-sm border transition-colors duration-200 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h3 className={`text-lg font-semibold mb-4 transition-colors duration-200 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Weekly vs Monthly</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className={`text-sm transition-colors duration-200 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Weekly Tickets</div>
                <div className="text-xl font-bold text-blue-600">{weeklyTickets.reduce((a, b) => a + b, 0)}</div>
              </div>
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-bold text-sm">W</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className={`text-sm transition-colors duration-200 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Monthly Tickets</div>
                <div className="text-xl font-bold text-purple-600">{monthlyTickets}</div>
              </div>
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-purple-600 font-bold text-sm">M</span>
              </div>
            </div>
          </div>
        </div>

        {/* Top Performing Events */}
        <div className={`rounded-2xl p-6 shadow-sm border transition-colors duration-200 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h3 className={`text-lg font-semibold mb-4 transition-colors duration-200 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Top Performing Events</h3>
          <div className="space-y-3">
            {topEvents.map((event, i) => {
              const performance = (event.revenue / 50000) * 100
              return (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className={`text-sm font-medium truncate transition-colors duration-200 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{event.name}</div>
                    <div className={`text-xs transition-colors duration-200 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>₹{event.revenue.toLocaleString()} • {event.tickets} tickets</div>
                  </div>
                  <div className="w-12 h-12 relative">
                    <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 36 36">
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth="2"
                      />
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="2"
                        strokeDasharray={`${performance}, 100`}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className={`text-xs font-bold transition-colors duration-200 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{Math.round(performance)}%</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Row 4 - Activity Logs */}
      <div className="grid grid-cols-1 gap-6">
        <div className={`rounded-2xl p-6 shadow-sm border transition-colors duration-200 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between mb-6">
            <h3 className={`text-lg font-semibold transition-colors duration-200 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Recent Activity Logs</h3>
            <button
              onClick={fetchActivityLogs}
              disabled={logsLoading}
              className="px-3 py-1 text-sm bg-orange-100 text-orange-600 rounded-lg hover:bg-orange-200 transition-colors duration-200 disabled:opacity-50"
            >
              {logsLoading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {activityLogs.length === 0 ? (
              <div className={`text-center py-8 transition-colors duration-200 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <DocumentTextIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No activity logs found</p>
                <p className="text-sm mt-1">System activities will appear here</p>
              </div>
            ) : (
              activityLogs.map((log) => (
                <div
                  key={log.id}
                  className={`flex items-start space-x-3 p-4 rounded-xl border transition-colors duration-200 ${darkMode ? 'border-gray-700 hover:bg-gray-700/50' : 'border-gray-100 hover:bg-gray-50'}`}
                >
                  <div className={`p-2 rounded-lg ${getActionColor(log.action)}`}>
                    {getActionIcon(log.action)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-2">
                        <span className={`text-sm font-medium transition-colors duration-200 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {log.action.toUpperCase()}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full transition-colors duration-200 ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                          {log.entity_type}
                        </span>
                      </div>
                      <span className={`text-xs transition-colors duration-200 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {new Date(log.performed_at).toLocaleString()}
                      </span>
                    </div>
                    
                    <p className={`text-sm transition-colors duration-200 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {formatLogDetails(log)}
                    </p>
                    
                    <div className="flex items-center justify-between mt-2">
                      <span className={`text-xs transition-colors duration-200 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                        by {log.performed_by}
                      </span>
                      {log.details && Object.keys(log.details).length > 0 && (
                        <details className="text-xs">
                          <summary className={`cursor-pointer transition-colors duration-200 ${darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}>
                            Details
                          </summary>
                          <pre className={`mt-2 p-2 rounded text-xs overflow-x-auto transition-colors duration-200 ${darkMode ? 'bg-gray-900 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

    </div>
  )
}

export default Dashboard