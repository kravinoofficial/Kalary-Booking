import React, { useState, useEffect } from 'react'
import { supabase, Ticket } from '../lib/supabase'
import { format } from 'date-fns'
import { QRCodeSVG as QRCode } from 'qrcode.react'
import { 
  MagnifyingGlassIcon, 
  PrinterIcon, 
  DocumentArrowDownIcon,
  XMarkIcon,
  EyeIcon
} from '@heroicons/react/24/outline'

interface TicketWithDetails extends Ticket {
  show?: {
    title: string
    date: string
    time: string
  }
}

interface BookingGroup {
  booking_id: string
  show?: {
    title: string
    date: string
    time: string
  }
  tickets: TicketWithDetails[]
  total_price: number
  seat_codes: string[]
  status: string
  generated_at: string
  booked_by: string
}

const Tickets: React.FC = () => {

  const [bookings, setBookings] = useState<BookingGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedBooking, setSelectedBooking] = useState<BookingGroup | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    fetchBookings()
  }, [])

  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select(`
          *,
          show:shows(title, date, time),
          booking:bookings(booked_by)
        `)
        .order('generated_at', { ascending: false })

      if (error) throw error
      
      // Group tickets by booking_id
      const groupedBookings = new Map<string, BookingGroup>()
      
      data?.forEach((ticket: any) => {
        const bookingId = ticket.booking_id
        
        if (!bookingId) {
          console.warn('Ticket has no booking_id:', ticket)
          return
        }
        
        if (!groupedBookings.has(bookingId)) {
          groupedBookings.set(bookingId, {
            booking_id: bookingId,
            show: ticket.show,
            tickets: [],
            total_price: 0,
            seat_codes: [],
            status: ticket.status,
            generated_at: ticket.generated_at,
            booked_by: ticket.booking?.booked_by || 'Unknown'
          })
        }
        
        const booking = groupedBookings.get(bookingId)!
        booking.tickets.push(ticket)
        booking.total_price += ticket.price
        if (!booking.seat_codes.includes(ticket.seat_code)) {
          booking.seat_codes.push(ticket.seat_code)
        }
        
        // If any ticket is revoked, mark the whole booking as revoked
        if (ticket.status === 'REVOKED') {
          booking.status = 'REVOKED'
        }
      })
      
      setBookings(Array.from(groupedBookings.values()))
    } catch (error) {
      console.error('Error fetching bookings:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = 
      booking.booking_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.seat_codes.some(seat => seat.toLowerCase().includes(searchTerm.toLowerCase())) ||
      booking.show?.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.tickets.some(ticket => ticket.ticket_code.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesStatus = statusFilter === 'all' || booking.status.toLowerCase() === statusFilter

    return matchesSearch && matchesStatus
  })

  const handlePrintBooking = (booking: BookingGroup) => {
    // Create a new window for printing
    const printWindow = window.open('', '_blank', 'width=800,height=600')
    if (!printWindow) return

    const ticketHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Booking Ticket - ${booking.booking_id.slice(0, 8)}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              margin: 0;
              padding: 20px;
              background: white;
            }
            .ticket {
              max-width: 500px;
              margin: 0 auto;
              border: 2px dashed #666;
              border-radius: 8px;
              padding: 30px;
              background: white;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .title {
              font-size: 24px;
              font-weight: bold;
              color: #1e40af;
              margin-bottom: 10px;
            }
            .divider {
              height: 1px;
              background: #ccc;
              margin: 20px 0;
            }
            .show-title {
              font-size: 18px;
              font-weight: 600;
              color: #333;
            }
            .info-section {
              margin: 20px 0;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              margin: 12px 0;
              align-items: flex-start;
            }
            .info-label {
              color: #666;
              font-weight: 500;
            }
            .info-value {
              font-weight: 600;
              color: #333;
              text-align: right;
              flex: 1;
              margin-left: 20px;
            }
            .seats-section {
              margin: 15px 0;
            }
            .seats-box {
              background: #f8f9fa;
              border: 1px solid #e9ecef;
              border-radius: 6px;
              padding: 12px;
              text-align: center;
              font-weight: 600;
              font-size: 14px;
              margin-top: 8px;
            }
            .qr-section {
              text-align: center;
              margin: 30px 0;
            }
            .footer {
              text-align: center;
              font-size: 12px;
              color: #666;
              margin-top: 30px;
            }
            .ticket-codes {
              background: #f8f9fa;
              border: 1px solid #e9ecef;
              border-radius: 6px;
              padding: 15px;
              margin: 15px 0;
            }
            .ticket-codes-title {
              font-weight: 600;
              text-align: center;
              margin-bottom: 10px;
              color: #333;
            }
            .ticket-code {
              font-family: 'Courier New', monospace;
              font-size: 11px;
              margin: 4px 0;
              color: #333;
            }
            @media print {
              body { margin: 0; padding: 15px; }
              .ticket { max-width: none; }
            }
          </style>
        </head>
        <body>
          <div class="ticket">
            <div class="header">
              <div class="title">KALARY BOOKING</div>
              <div class="divider"></div>
              <div class="show-title">${booking.show?.title || 'N/A'}</div>
            </div>
            
            <div class="info-section">
              <div class="info-row">
                <span class="info-label">Date:</span>
                <span class="info-value">${booking.show?.date ? format(new Date(booking.show.date), 'MMM dd, yyyy') : 'N/A'}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Time:</span>
                <span class="info-value">${booking.show?.time || 'N/A'}</span>
              </div>
              <div class="seats-section">
                <div class="info-label">Seats:</div>
                <div class="seats-box">${booking.seat_codes.join(', ')}</div>
              </div>
              <div class="info-row">
                <span class="info-label">Quantity:</span>
                <span class="info-value">${booking.tickets.length} ticket(s)</span>
              </div>
              <div class="info-row">
                <span class="info-label">Total Price:</span>
                <span class="info-value">₹${booking.total_price}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Booked By:</span>
                <span class="info-value">${booking.booked_by}</span>
              </div>
            </div>

            <div class="qr-section">
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(JSON.stringify({
                booking_id: booking.booking_id,
                show_id: booking.tickets[0]?.show_id,
                seat_codes: booking.seat_codes,
                ticket_codes: booking.tickets.map(t => t.ticket_code)
              }))}" alt="QR Code" style="width: 120px; height: 120px; margin: 0 auto; display: block;" />
            </div>

            <div class="ticket-codes">
              <div class="ticket-codes-title">Ticket Codes:</div>
              ${booking.tickets.map((ticket, index) => 
                `<div class="ticket-code">${index + 1}. ${ticket.ticket_code}</div>`
              ).join('')}
            </div>

            <div class="footer">
              <div>Booking ID: ${booking.booking_id.slice(0, 8)}...</div>
              <div>Generated: ${format(new Date(booking.generated_at), 'MMM dd, yyyy HH:mm')}</div>
            </div>
          </div>
        </body>
      </html>
    `

    printWindow.document.write(ticketHTML)
    printWindow.document.close()
    
    // Wait for content to load, then print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print()
        printWindow.close()
      }, 250)
    }
  }



  const BookingTicketPreview: React.FC<{ booking: BookingGroup }> = ({ booking }) => (
    <div className="ticket-page bg-white p-4 border-2 border-dashed border-gray-300 rounded-lg print:border-black print:p-8 print:m-0 print:rounded-none print:max-w-none print:w-full print:h-full print:flex print:flex-col print:justify-center">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-blue-900 mb-2">KALARY BOOKING</h1>
        <div className="w-full h-px bg-gray-300 mb-4"></div>
        <h2 className="text-lg font-semibold text-gray-900">{booking.show?.title}</h2>
      </div>

      <div className="space-y-4 mb-6">
        <div className="flex justify-between">
          <span className="text-gray-600">Date:</span>
          <span className="font-medium">
            {booking.show?.date ? format(new Date(booking.show.date), 'MMM dd, yyyy') : 'N/A'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Time:</span>
          <span className="font-medium">{booking.show?.time}</span>
        </div>
        <div className="space-y-1">
          <div className="text-gray-600">Seats:</div>
          <div className="font-medium text-sm text-center bg-gray-50 p-2 rounded border">
            {booking.seat_codes.join(', ')}
          </div>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Quantity:</span>
          <span className="font-medium">{booking.tickets.length} ticket(s)</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Total Price:</span>
          <span className="font-medium text-lg">₹{booking.total_price}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Booked By:</span>
          <span className="font-medium">{booking.booked_by}</span>
        </div>
      </div>

      <div className="text-center mb-4">
        <QRCode 
          value={JSON.stringify({
            booking_id: booking.booking_id,
            show_id: booking.tickets[0]?.show_id,
            seat_codes: booking.seat_codes,
            ticket_codes: booking.tickets.map(t => t.ticket_code)
          })}
          size={120}
          className="mx-auto"
        />
      </div>

      <div className="text-center text-xs text-gray-500 space-y-2">
        <div className="font-medium">Booking ID: {booking.booking_id.slice(0, 8)}...</div>
        <div className="bg-gray-50 p-3 rounded border space-y-1 text-left">
          <div className="font-medium text-center mb-2">Ticket Codes:</div>
          {booking.tickets.map((ticket, index) => (
            <div key={ticket.id} className="font-mono text-xs">
              {index + 1}. {ticket.ticket_code}
            </div>
          ))}
        </div>
        <div className="font-medium">Generated: {format(new Date(booking.generated_at), 'MMM dd, yyyy HH:mm')}</div>
        {booking.status === 'REVOKED' && (
          <div className="text-red-600 font-bold text-lg mt-4 transform rotate-12">
            CANCELLED
          </div>
        )}
      </div>
    </div>
  )

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
        <h1 className="text-3xl font-bold text-gray-900">Ticket History</h1>
        <p className="text-gray-600 mt-2">View, print, and manage all generated tickets</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by ticket code, seat, or show..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="revoked">Revoked</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Booking ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Show
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Seats
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Generated
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredBookings.map((booking) => (
                <tr key={booking.booking_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-mono text-gray-900">
                      {booking.booking_id.slice(0, 8)}...
                    </div>
                    <div className="text-xs text-gray-500">
                      {booking.booked_by}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{booking.show?.title}</div>
                    <div className="text-sm text-gray-500">
                      {booking.show?.date ? format(new Date(booking.show.date), 'MMM dd, yyyy') : 'N/A'} at {booking.show?.time}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
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
                      {booking.tickets.length} ticket(s)
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">₹{booking.total_price}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      booking.status === 'ACTIVE' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {booking.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {format(new Date(booking.generated_at), 'MMM dd, yyyy')}
                    </div>
                    <div className="text-sm text-gray-500">
                      {format(new Date(booking.generated_at), 'HH:mm')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setSelectedBooking(booking)
                          setShowPreview(true)
                        }}
                        className="text-primary-600 hover:text-primary-900"
                        title="Preview"
                      >
                        <EyeIcon className="h-5 w-5" />
                      </button>
                      {booking.status === 'ACTIVE' && (
                        <button
                          onClick={() => handlePrintBooking(booking)}
                          className="text-green-600 hover:text-green-900"
                          title="Print"
                        >
                          <PrinterIcon className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>



      {/* Preview Modal */}
      {showPreview && selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 no-print p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col">
            {/* Fixed Header */}
            <div className="flex justify-between items-center p-6 pb-4 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Booking Ticket Preview</h3>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <BookingTicketPreview booking={selectedBooking} />
            </div>
            
            {/* Fixed Footer */}
            <div className="flex space-x-4 p-6 pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowPreview(false)
                  handlePrintBooking(selectedBooking)
                }}
                className="flex-1 bg-primary-600 text-white py-3 px-4 rounded-xl font-medium hover:bg-primary-700 transition-colors flex items-center justify-center"
              >
                <PrinterIcon className="h-5 w-5 mr-2" />
                Print Booking
              </button>
              <button
                onClick={() => setShowPreview(false)}
                className="flex-1 bg-gray-200 text-gray-800 py-3 px-4 rounded-xl font-medium hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Tickets