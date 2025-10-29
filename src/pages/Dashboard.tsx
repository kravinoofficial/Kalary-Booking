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
  yesterdayRevenue: number
  dailyGrowth: number
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
    lastMonthRevenue: 0,
    yesterdayRevenue: 0,
    dailyGrowth: 0
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
      const yesterday = subDays(now, 1).toISOString().split('T')[0]

      // Date ranges
      const thisWeekStart = startOfWeek(now).toISOString()
      const thisWeekEnd = endOfWeek(now).toISOString()
      const lastWeekStart = startOfWeek(subWeeks(now, 1)).toISOString()
      const lastWeekEnd = endOfWeek(subWeeks(now, 1)).toISOString()

      const thisMonthStart = startOfMonth(now).toISOString()
      const thisMonthEnd = endOfMonth(now).toISOString()
      const lastMonthStart = startOfMonth(subMonths(now, 1)).toISOString()
      const lastMonthEnd = endOfMonth(subMonths(now, 1)).toISOString()

      // Get all tickets for total revenue (including ACTIVE and COMPLETED)
      const { data: allTickets } = await supabase
        .from('tickets')
        .select('price, generated_at, status')
        .in('status', ['ACTIVE', 'COMPLETED'])

      if (!allTickets) return

      // Calculate total revenue from all valid tickets
      const totalRevenue = allTickets.reduce((sum, ticket) => sum + ticket.price, 0)

      // Today's data
      const todayTickets = allTickets.filter(ticket => {
        const ticketDate = new Date(ticket.generated_at).toISOString().split('T')[0]
        return ticketDate === today
      })
      const todayRevenue = todayTickets.reduce((sum, ticket) => sum + ticket.price, 0)

      // Yesterday's data
      const yesterdayTickets = allTickets.filter(ticket => {
        const ticketDate = new Date(ticket.generated_at).toISOString().split('T')[0]
        return ticketDate === yesterday
      })
      const yesterdayRevenue = yesterdayTickets.reduce((sum, ticket) => sum + ticket.price, 0)

      // This week's data
      const thisWeekTickets = allTickets.filter(ticket => {
        const ticketDateTime = new Date(ticket.generated_at)
        return ticketDateTime >= new Date(thisWeekStart) && ticketDateTime <= new Date(thisWeekEnd)
      })
      const weekRevenue = thisWeekTickets.reduce((sum, ticket) => sum + ticket.price, 0)

      // Last week's data
      const lastWeekTickets = allTickets.filter(ticket => {
        const ticketDateTime = new Date(ticket.generated_at)
        return ticketDateTime >= new Date(lastWeekStart) && ticketDateTime <= new Date(lastWeekEnd)
      })
      const lastWeekRevenue = lastWeekTickets.reduce((sum, ticket) => sum + ticket.price, 0)

      // This month's data
      const thisMonthTickets = allTickets.filter(ticket => {
        const ticketDateTime = new Date(ticket.generated_at)
        return ticketDateTime >= new Date(thisMonthStart) && ticketDateTime <= new Date(thisMonthEnd)
      })
      const monthRevenue = thisMonthTickets.reduce((sum, ticket) => sum + ticket.price, 0)

      // Last month's data
      const lastMonthTickets = allTickets.filter(ticket => {
        const ticketDateTime = new Date(ticket.generated_at)
        return ticketDateTime >= new Date(lastMonthStart) && ticketDateTime <= new Date(lastMonthEnd)
      })
      const lastMonthRevenue = lastMonthTickets.reduce((sum, ticket) => sum + ticket.price, 0)

      // Debug logging
      console.log('Debug - Date ranges:', {
        today,
        yesterday,
        thisWeekStart,
        thisWeekEnd,
        lastWeekStart,
        lastWeekEnd,
        thisMonthStart,
        thisMonthEnd,
        lastMonthStart,
        lastMonthEnd
      })
      
      console.log('Debug - Revenue calculations:', {
        totalTickets: allTickets.length,
        todayRevenue,
        yesterdayRevenue,
        weekRevenue,
        lastWeekRevenue,
        monthRevenue,
        lastMonthRevenue,
        todayTickets: todayTickets.length,
        yesterdayTickets: yesterdayTickets.length,
        thisWeekTickets: thisWeekTickets.length,
        lastWeekTickets: lastWeekTickets.length
      })

      // Calculate growth percentages
      const weeklyGrowth = lastWeekRevenue > 0 ? ((weekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100 : (weekRevenue > 0 ? 100 : 0)
      const monthlyGrowth = lastMonthRevenue > 0 ? ((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : (monthRevenue > 0 ? 100 : 0)
      const dailyGrowth = yesterdayRevenue > 0 ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 : (todayRevenue > 0 ? 100 : 0)

      setMetrics({
        totalRevenue,
        todayRevenue,
        weekRevenue,
        monthRevenue,
        todayBookings: todayTickets.length,
        weeklyGrowth,
        monthlyGrowth,
        lastWeekRevenue,
        lastMonthRevenue,
        yesterdayRevenue,
        dailyGrowth
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
        .limit(10) // Get more shows to filter from

      if (!shows) return

      const events: UpcomingEvent[] = []
      const now = new Date()

      for (const show of shows) {
        // Check if show has already started
        const showDateTime = new Date(`${show.date}T${show.time}`)
        
        // Skip shows that have already started
        if (showDateTime <= now) {
          continue
        }

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

        // Calculate countdown (we know it's not started since we filtered above)
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

        // Stop when we have 3 upcoming events
        if (events.length >= 3) {
          break
        }
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
          .in('status', ['ACTIVE', 'COMPLETED'])

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
        .in('status', ['ACTIVE', 'COMPLETED'])
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
        if (log.entity_type === 'SHOW' && details.changes) {
          const changes = details.changes
          const changesList = Object.keys(changes).map(field => {
            const change = changes[field]
            if (field === 'price') {
              return `${field}: ₹${change.from} → ₹${change.to}`
            } else if (field === 'active') {
              return `${field}: ${change.from ? 'Active' : 'Inactive'} → ${change.to ? 'Active' : 'Inactive'}`
            } else {
              return `${field}: "${change.from}" → "${change.to}"`
            }
          })
          return `Updated show "${log.entity_name}" - ${changesList.join(', ')}`
        }
        return `Updated ${log.entity_type.toLowerCase()}: ${log.entity_name}`
      case 'delete':
        return `Deleted ${log.entity_type.toLowerCase()}: ${log.entity_name}`
      case 'cancellation':
        return `Cancelled booking for ${details.seat_count || 1} seat(s)`
      case 'export':
        if (log.entity_type === 'ANALYTICS') {
          return `Exported ${details.format} analytics report (${details.dateRange?.start} to ${details.dateRange?.end})`
        } else if (log.entity_type === 'REPORT') {
          return `Exported ${details.format} booking report for "${details.showTitle}"`
        }
        return `Exported ${log.entity_name}`
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
          </div>
          <div>
            <h3 className={`text-sm font-medium mb-1 transition-colors duration-200 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Revenue</h3>
            <p className={`text-2xl font-bold transition-colors duration-200 ${darkMode ? 'text-white' : 'text-gray-900'}`}>₹{metrics.totalRevenue.toLocaleString()}</p>
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
            <div className="flex items-center justify-between mt-1">
              <p className={`text-xs transition-colors duration-200 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>Bookings: {metrics.todayBookings} tickets</p>
              <div className="flex items-center space-x-1" title={`${metrics.dailyGrowth >= 0 ? 'Up' : 'Down'} ${Math.abs(metrics.dailyGrowth).toFixed(1)}% from yesterday (₹${metrics.yesterdayRevenue.toLocaleString()})`}>
                <ArrowTrendingUpIcon 
                  className={`h-3 w-3 ${
                    metrics.dailyGrowth >= 0 
                      ? 'text-green-500 rotate-0' 
                      : 'text-red-500 rotate-180'
                  }`} 
                />
                <span className={`text-xs font-medium ${
                  metrics.dailyGrowth >= 0 
                    ? 'text-green-600' 
                    : 'text-red-600'
                }`}>
                  {Math.abs(metrics.dailyGrowth).toFixed(1)}%
                </span>
              </div>
            </div>
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
        </div>
      </div>

      {/* Row 2 - Upcoming Events */}
      {upcomingEvents.length > 0 && (
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
      )}

      {/* Row 3 - Revenue Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Analytics */}
        <div className={`rounded-2xl p-6 shadow-sm border transition-colors duration-200 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h3 className={`text-lg font-semibold mb-4 transition-colors duration-200 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Performance Analytics</h3>
          <div className="space-y-4">
            {/* Weekly Growth */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
              <div>
                <div className={`text-sm font-medium transition-colors duration-200 ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>Weekly Growth</div>
                <div className="flex items-center space-x-2">
                  <span className={`text-lg font-bold transition-colors duration-200 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {metrics.weeklyGrowth >= 0 ? '+' : ''}{metrics.weeklyGrowth.toFixed(1)}%
                  </span>
                  <ArrowTrendingUpIcon 
                    className={`h-4 w-4 ${
                      metrics.weeklyGrowth >= 0 
                        ? 'text-green-500 rotate-0' 
                        : 'text-red-500 rotate-180'
                    }`} 
                  />
                </div>
                <div className={`text-xs transition-colors duration-200 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  vs last week (₹{metrics.lastWeekRevenue.toLocaleString()})
                </div>
              </div>
            </div>

            {/* Monthly Growth */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
              <div>
                <div className={`text-sm font-medium transition-colors duration-200 ${darkMode ? 'text-purple-300' : 'text-purple-700'}`}>Monthly Growth</div>
                <div className="flex items-center space-x-2">
                  <span className={`text-lg font-bold transition-colors duration-200 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {metrics.monthlyGrowth >= 0 ? '+' : ''}{metrics.monthlyGrowth.toFixed(1)}%
                  </span>
                  <ArrowTrendingUpIcon 
                    className={`h-4 w-4 ${
                      metrics.monthlyGrowth >= 0 
                        ? 'text-green-500 rotate-0' 
                        : 'text-red-500 rotate-180'
                    }`} 
                  />
                </div>
                <div className={`text-xs transition-colors duration-200 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  vs last month (₹{metrics.lastMonthRevenue.toLocaleString()})
                </div>
              </div>
            </div>

            {/* Average Ticket Value */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
              <div>
                <div className={`text-sm font-medium transition-colors duration-200 ${darkMode ? 'text-green-300' : 'text-green-700'}`}>Avg. Ticket Value</div>
                <div className={`text-lg font-bold transition-colors duration-200 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  ₹{metrics.todayBookings > 0 ? (metrics.todayRevenue / metrics.todayBookings).toFixed(0) : '0'}
                </div>
                <div className={`text-xs transition-colors duration-200 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Today's average
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Business Insights */}
        <div className={`rounded-2xl p-6 shadow-sm border transition-colors duration-200 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h3 className={`text-lg font-semibold mb-4 transition-colors duration-200 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Business Insights</h3>
          <div className="space-y-4">
            {/* Revenue Trend */}
            <div className="p-4 rounded-lg border border-dashed border-gray-300 dark:border-gray-600">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <ChartBarIcon className="h-5 w-5 text-blue-500" />
                  <span className={`text-sm font-medium transition-colors duration-200 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Revenue Trend</span>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  metrics.dailyGrowth >= 0 
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' 
                    : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                }`}>
                  {metrics.dailyGrowth >= 0 ? 'Trending Up' : 'Trending Down'}
                </span>
              </div>
              <p className={`text-xs transition-colors duration-200 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                {metrics.dailyGrowth >= 0 
                  ? `Revenue is up ${Math.abs(metrics.dailyGrowth).toFixed(1)}% from yesterday. Keep up the momentum!`
                  : `Revenue is down ${Math.abs(metrics.dailyGrowth).toFixed(1)}% from yesterday. Consider promotional strategies.`
                }
              </p>
            </div>

            {/* Booking Performance */}
            <div className="p-4 rounded-lg border border-dashed border-gray-300 dark:border-gray-600">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <TicketIcon className="h-5 w-5 text-orange-500" />
                  <span className={`text-sm font-medium transition-colors duration-200 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Booking Activity</span>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  metrics.todayBookings > 0 
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' 
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-700/60 dark:text-gray-300'
                }`}>
                  {metrics.todayBookings > 0 ? 'Active' : 'Quiet'}
                </span>
              </div>
              <p className={`text-xs transition-colors duration-200 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                {metrics.todayBookings > 0 
                  ? `${metrics.todayBookings} tickets sold today. Average price: ₹${(metrics.todayRevenue / metrics.todayBookings).toFixed(0)}`
                  : 'No bookings today yet. Consider marketing campaigns or check upcoming shows.'
                }
              </p>
            </div>

            {/* Quick Actions */}
            <div className="p-4 rounded-lg bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20">
              <div className="flex items-center space-x-2 mb-2">
                <CurrencyDollarIcon className="h-5 w-5 text-orange-500" />
                <span className={`text-sm font-medium transition-colors duration-200 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Quick Actions</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className={`px-3 py-1 text-xs border rounded-lg transition-colors duration-200 ${darkMode ? 'bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
                  View Reports
                </button>
                <button className={`px-3 py-1 text-xs border rounded-lg transition-colors duration-200 ${darkMode ? 'bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
                  Add Show
                </button>
                <button className={`px-3 py-1 text-xs border rounded-lg transition-colors duration-200 ${darkMode ? 'bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
                  Export Data
                </button>
              </div>
            </div>
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