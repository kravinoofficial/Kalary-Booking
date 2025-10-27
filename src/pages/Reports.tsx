import React, { useState, useEffect } from 'react'
import { supabase, Show } from '../lib/supabase'
import { format } from 'date-fns'
import { 
  DocumentArrowDownIcon,
  ChartBarIcon,
  CalendarIcon
} from '@heroicons/react/24/outline'

interface BookingReport {
  booking_id: string
  show_title: string
  show_date: string
  show_time: string
  seat_codes: string[]
  total_tickets: number
  total_amount: number
  booked_by: string
  booking_time: string
  status: string
}

const Reports: React.FC = () => {
  const [shows, setShows] = useState<Show[]>([])
  const [selectedShow, setSelectedShow] = useState<Show | null>(null)
  const [bookingData, setBookingData] = useState<BookingReport[]>([])
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState({
    totalBookings: 0,
    totalTickets: 0,
    totalRevenue: 0,
    averageTicketsPerBooking: 0
  })

  useEffect(() => {
    fetchShows()
  }, [])

  const fetchShows = async () => {
    try {
      const { data, error } = await supabase
        .from('shows')
        .select('*')
        .order('date', { ascending: false })

      if (error) throw error
      setShows(data || [])
    } catch (error) {
      console.error('Error fetching shows:', error)
    }
  }

  const fetchBookingReport = async (showId: string) => {
    setLoading(true)
    try {
      // Get bookings with tickets for the selected show
      const { data: tickets, error } = await supabase
        .from('tickets')
        .select(`
          *,
          booking:bookings(
            id,
            seat_code,
            booked_by,
            booking_time,
            status
          ),
          show:shows(
            title,
            date,
            time
          )
        `)
        .eq('show_id', showId)
        .order('generated_at', { ascending: false })

      if (error) throw error

      // Group tickets by booking
      const bookingMap = new Map<string, BookingReport>()
      
      tickets?.forEach((ticket: any) => {
        const bookingId = ticket.booking_id
        
        if (!bookingMap.has(bookingId)) {
          // Parse seat codes from booking
          let seatCodes: string[] = []
          try {
            // Try JSON format first
            seatCodes = JSON.parse(ticket.booking.seat_code)
          } catch {
            // Fall back to comma-separated format
            seatCodes = ticket.booking.seat_code.includes(',') 
              ? ticket.booking.seat_code.split(',').map((s: string) => s.trim())
              : [ticket.booking.seat_code]
          }

          bookingMap.set(bookingId, {
            booking_id: bookingId,
            show_title: ticket.show.title,
            show_date: ticket.show.date,
            show_time: ticket.show.time,
            seat_codes: seatCodes,
            total_tickets: 0,
            total_amount: 0,
            booked_by: ticket.booking.booked_by,
            booking_time: ticket.booking.booking_time,
            status: ticket.booking.status
          })
        }

        const booking = bookingMap.get(bookingId)!
        booking.total_tickets += 1
        booking.total_amount += ticket.price
      })

      const reportData = Array.from(bookingMap.values())
      setBookingData(reportData)

      // Calculate summary
      const totalBookings = reportData.length
      const totalTickets = reportData.reduce((sum, booking) => sum + booking.total_tickets, 0)
      const totalRevenue = reportData.reduce((sum, booking) => sum + booking.total_amount, 0)
      const averageTicketsPerBooking = totalBookings > 0 ? totalTickets / totalBookings : 0

      setSummary({
        totalBookings,
        totalTickets,
        totalRevenue,
        averageTicketsPerBooking: Math.round(averageTicketsPerBooking * 100) / 100
      })

    } catch (error) {
      console.error('Error fetching booking report:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateCSV = () => {
    if (!selectedShow || bookingData.length === 0) return

    const headers = [
      'Booking ID',
      'Show Title',
      'Show Date',
      'Show Time',
      'Seats',
      'Total Tickets',
      'Total Amount (₹)',
      'Booked By',
      'Booking Time',
      'Status'
    ]

    const csvData = bookingData.map(booking => [
      booking.booking_id.slice(0, 8) + '...',
      booking.show_title,
      format(new Date(booking.show_date), 'MMM dd, yyyy'),
      booking.show_time,
      booking.seat_codes.join('; '),
      booking.total_tickets,
      booking.total_amount,
      booking.booked_by,
      format(new Date(booking.booking_time), 'MMM dd, yyyy HH:mm'),
      booking.status
    ])

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    link.setAttribute('href', url)
    link.setAttribute('download', `booking-report-${selectedShow.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${format(new Date(), 'yyyy-MM-dd')}.csv`)
    link.style.visibility = 'hidden'
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-600 mt-2">Generate booking reports and export data</p>
      </div>

      {/* Show Selection */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <CalendarIcon className="h-5 w-5 mr-2" />
          Select Show for Report
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {shows.map((show) => (
            <button
              key={show.id}
              onClick={() => {
                setSelectedShow(show)
                fetchBookingReport(show.id)
              }}
              className={`p-4 rounded-xl border-2 text-left transition-colors ${
                selectedShow?.id === show.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-medium text-gray-900">{show.title}</div>
              <div className="text-sm text-gray-600">
                {format(new Date(show.date), 'MMM dd, yyyy')} at {show.time}
              </div>
              <div className="text-sm font-medium text-blue-600">₹{show.price}</div>
              <div className={`text-xs px-2 py-1 rounded-full inline-block mt-2 ${
                show.active 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {show.active ? 'Active' : 'Inactive'}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Report Summary */}
      {selectedShow && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <ChartBarIcon className="h-5 w-5 mr-2" />
              Booking Summary - {selectedShow.title}
            </h2>
            <button
              onClick={generateCSV}
              disabled={loading || bookingData.length === 0}
              className="bg-green-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
              Export CSV
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-xl">
                  <div className="text-2xl font-bold text-blue-600">{summary.totalBookings}</div>
                  <div className="text-sm text-blue-800">Total Bookings</div>
                </div>
                <div className="bg-green-50 p-4 rounded-xl">
                  <div className="text-2xl font-bold text-green-600">{summary.totalTickets}</div>
                  <div className="text-sm text-green-800">Total Tickets</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-xl">
                  <div className="text-2xl font-bold text-purple-600">₹{summary.totalRevenue.toLocaleString()}</div>
                  <div className="text-sm text-purple-800">Total Revenue</div>
                </div>
                <div className="bg-orange-50 p-4 rounded-xl">
                  <div className="text-2xl font-bold text-orange-600">{summary.averageTicketsPerBooking}</div>
                  <div className="text-sm text-orange-800">Avg Tickets/Booking</div>
                </div>
              </div>

              {/* Booking Details Table */}
              {bookingData.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Booking ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Seats
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tickets
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Booked By
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Booking Time
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {bookingData.map((booking) => (
                        <tr key={booking.booking_id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-mono text-gray-900">
                              {booking.booking_id.slice(0, 8)}...
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">
                              {booking.seat_codes.length > 3 
                                ? `${booking.seat_codes.slice(0, 3).join(', ')}...` 
                                : booking.seat_codes.join(', ')
                              }
                            </div>
                            {booking.seat_codes.length > 3 && (
                              <div className="text-xs text-gray-500">
                                +{booking.seat_codes.length - 3} more
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {booking.total_tickets}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              ₹{booking.total_amount.toLocaleString()}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{booking.booked_by}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {format(new Date(booking.booking_time), 'MMM dd, yyyy')}
                            </div>
                            <div className="text-sm text-gray-500">
                              {format(new Date(booking.booking_time), 'HH:mm')}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              booking.status === 'CONFIRMED' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {booking.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No bookings found for this show.
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default Reports