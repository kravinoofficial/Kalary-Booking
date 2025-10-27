import React, { useState, useEffect } from 'react'
import { supabase, Show } from '../lib/supabase'
import { motion } from 'framer-motion'
import { format } from 'date-fns'

interface SeatData {
  id: string
  section: string
  row: string
  seat_number: string
  price: number
  booked: boolean
  seatName?: string
}

const Booking: React.FC = () => {
  const [shows, setShows] = useState<Show[]>([])
  const [selectedShow, setSelectedShow] = useState<Show | null>(null)
  const [seats, setSeats] = useState<SeatData[]>([])
  const [selectedSeats, setSelectedSeats] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [bookingResult, setBookingResult] = useState<any>(null)

  useEffect(() => {
    fetchActiveShows()
  }, [])

  useEffect(() => {
    if (selectedShow) {
      fetchSeatsForShow(selectedShow.id)
    }
  }, [selectedShow])

  const fetchActiveShows = async () => {
    try {
      const { data, error } = await supabase
        .from('shows')
        .select(`
          *,
          layout:layouts(*)
        `)
        .eq('active', true)
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date')

      if (error) throw error
      setShows(data || [])
    } catch (error) {
      console.error('Error fetching shows:', error)
    }
  }

  const fetchSeatsForShow = async (showId: string) => {
    setLoading(true)
    try {
      // Get layout structure and generate seats
      const show = shows.find(s => s.id === showId)
      if (!show?.layout) return

      const generatedSeats: SeatData[] = []

      show.layout.structure.sections?.forEach((section: any) => {
        for (let row = 1; row <= section.rows; row++) {
          const rowLetter = String.fromCharCode(64 + row) // A, B, C, D...
          const sectionPrefix = section.name.charAt(0).toUpperCase() // N, S, E, W

          for (let seat = 1; seat <= section.seatsPerRow; seat++) {
            const seatName = `${sectionPrefix}${rowLetter}${seat}` // NA1, NA2, etc.
            const seatId = `${section.name}-${rowLetter}-${seat}`
            generatedSeats.push({
              id: seatId,
              section: section.name,
              row: row.toString(),
              seat_number: seat.toString(),
              price: section.price,
              booked: false,
              seatName: seatName
            })
          }
        }
      })

      // Check which seats are already booked
      const { data: bookings } = await supabase
        .from('bookings')
        .select('seat_code')
        .eq('show_id', showId)
        .eq('status', 'CONFIRMED')

      // Handle JSON format, comma-separated, and single seats
      const bookedSeats = new Set<string>()
      bookings?.forEach(booking => {
        try {
          // Try to parse as JSON first (new format)
          const seats = JSON.parse(booking.seat_code)
          if (Array.isArray(seats)) {
            seats.forEach(seat => bookedSeats.add(seat))
          } else {
            bookedSeats.add(booking.seat_code)
          }
        } catch {
          // Fall back to comma-separated or single seat format (old format)
          if (booking.seat_code.includes(',')) {
            booking.seat_code.split(',').forEach((seat: string) => bookedSeats.add(seat.trim()))
          } else {
            bookedSeats.add(booking.seat_code)
          }
        }
      })

      generatedSeats.forEach(seat => {
        seat.booked = bookedSeats.has(seat.id)
      })

      setSeats(generatedSeats)
    } catch (error) {
      console.error('Error fetching seats:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleSeat = (seatId: string) => {
    const seat = seats.find(s => s.id === seatId)
    if (!seat || seat.booked) return

    setSelectedSeats(prev =>
      prev.includes(seatId)
        ? prev.filter(id => id !== seatId)
        : [...prev, seatId]
    )
  }

  const getTotalAmount = () => {
    // Use uniform price for all seats (get from show price or first section price)
    const uniformPrice = selectedShow?.price || 100
    return selectedSeats.length * uniformPrice
  }

  const handleBookSeats = async () => {
    if (!selectedShow || selectedSeats.length === 0) return

    try {
      setLoading(true)

      // First, check if any selected seats are already booked
      const { data: existingBookings, error: checkError } = await supabase
        .from('bookings')
        .select('seat_code')
        .eq('show_id', selectedShow.id)
        .eq('status', 'CONFIRMED')

      if (checkError) throw checkError

      if (existingBookings && existingBookings.length > 0) {
        // Check for conflicts with existing bookings
        const allBookedSeats = existingBookings.flatMap(booking => {
          try {
            // Try to parse as JSON first (new format)
            return JSON.parse(booking.seat_code)
          } catch {
            // Fall back to comma-separated format (old format)
            return booking.seat_code.includes(',') 
              ? booking.seat_code.split(',').map((s: string) => s.trim())
              : [booking.seat_code]
          }
        })
        
        const conflictingSeats = selectedSeats.filter(seat => allBookedSeats.includes(seat))
        
        if (conflictingSeats.length > 0) {
          alert(`Some seats are already booked: ${conflictingSeats.join(', ')}. Please refresh and try again.`)
          fetchSeatsForShow(selectedShow.id)
          return
        }
      }

      // Create a single booking record for all selected seats
      // Use JSON format to avoid character limits with comma-separated values
      const bookingToInsert = {
        show_id: selectedShow.id,
        seat_code: JSON.stringify(selectedSeats), // Store as JSON array to avoid length limits
        booked_by: 'admin', // In a real app, this would be the current user
        booking_time: new Date().toISOString(),
        status: 'CONFIRMED'
      }

      const { data: bookings, error: bookingError } = await supabase
        .from('bookings')
        .insert([bookingToInsert])
        .select()

      if (bookingError) throw bookingError

      const booking = bookings[0]

      // Create tickets for each seat under the same booking
      const ticketsToInsert = selectedSeats.map(seatCode => ({
        booking_id: booking.id,
        show_id: selectedShow.id,
        seat_code: seatCode,
        ticket_code: `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        price: selectedShow.price || 100,
        generated_by: 'admin',
        generated_at: new Date().toISOString(),
        status: 'ACTIVE'
      }))

      const { data: tickets, error: ticketError } = await supabase
        .from('tickets')
        .insert(ticketsToInsert)
        .select()

      if (ticketError) throw ticketError

      setBookingResult({ 
        bookings, 
        tickets,
        success: true,
        message: `Successfully booked ${selectedSeats.length} seat(s)`,
        totalAmount: getTotalAmount()
      })
      setShowConfirmation(true)
      setSelectedSeats([])

      // Refresh seats
      fetchSeatsForShow(selectedShow.id)
    } catch (error) {
      console.error('Error booking seats:', error)
      alert(`Error booking seats: ${error instanceof Error ? error.message : 'Please try again.'}`)
    } finally {
      setLoading(false)
    }
  }

  const renderSeatMap = () => {
    if (!selectedShow?.layout) return null

    const sections = selectedShow.layout.structure.sections || []

    return (
      <div className="bg-white rounded-2xl p-3 sm:p-6 min-h-[400px] sm:min-h-[600px] w-full overflow-x-auto">
        {/* Stage at center */}
        <div className="flex flex-col items-center space-y-8">

          {/* North Section */}
          {sections.filter((s: any) => s.name === 'North').map((section: any) => {
            const sectionSeats = seats.filter(s => s.section === section.name)
            return (
              <div key={section.name} className="text-center">
                <div className="text-sm font-semibold text-gray-600 mb-2">
                  {section.name.toUpperCase()}
                </div>
                <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${section.seatsPerRow}, 1fr)` }}>
                  {Array.from({ length: section.rows }, (_, rowIndex) =>
                    Array.from({ length: section.seatsPerRow }, (_, seatIndex) => {
                      const seatNumber = seatIndex + 1
                      // Reverse row order for North section so A is closest to stage (bottom)
                      const actualRowIndex = section.rows - 1 - rowIndex
                      const rowLetter = String.fromCharCode(65 + actualRowIndex)
                      const sectionPrefix = section.name.charAt(0).toUpperCase()
                      const seatName = `${sectionPrefix}${rowLetter}${seatNumber}`
                      const seatId = `${section.name}-${rowLetter}-${seatNumber}`

                      const seat = sectionSeats.find(s =>
                        s.row === (actualRowIndex + 1).toString() &&
                        s.seat_number === seatNumber.toString()
                      ) || {
                        id: seatId,
                        section: section.name,
                        row: (actualRowIndex + 1).toString(),
                        seat_number: seatNumber.toString(),
                        price: section.price,
                        booked: false,
                        seatName: seatName
                      }

                      return (
                        <motion.button
                          key={seat.id}
                          onClick={() => toggleSeat(seat.id)}
                          disabled={seat.booked}
                          whileHover={{ scale: seat.booked ? 1 : 1.05 }}
                          whileTap={{ scale: seat.booked ? 1 : 0.95 }}
                          className={`w-10 h-8 rounded border-2 text-xs font-medium transition-all ${seat.booked
                            ? 'bg-red-100 border-red-400 text-red-600 cursor-not-allowed'
                            : selectedSeats.includes(seat.id)
                              ? 'bg-green-100 border-green-400 text-green-700'
                              : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100 hover:border-gray-400'
                            }`}
                          title={`${seatName} - ₹${section.price}`}
                        >
                          {seatNumber}
                        </motion.button>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}

          {/* Middle Section with East, Stage, West */}
          <div className="flex items-center justify-center space-x-4 sm:space-x-8 lg:space-x-20 w-full min-h-[300px] sm:min-h-[400px]">

            {/* West Section */}
            {sections.filter((s: any) => s.name === 'West').map((section: any) => {
              const sectionSeats = seats.filter(s => s.section === section.name)
              return (
                <div key={section.name} className="flex flex-col items-center">
                  <div className="text-sm font-semibold text-gray-600 mb-4">
                    {section.name.toUpperCase()}
                  </div>
                  <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${section.rows}, 1fr)` }}>
                    {Array.from({ length: section.rows }, (_, rowIndex) =>
                      <div key={rowIndex} className="flex flex-col gap-1">
                        {Array.from({ length: section.seatsPerRow }, (_, seatIndex) => {
                          // For West section, reverse column order so A column is closest to stage
                          const seatNumber = seatIndex + 1
                          const actualRowIndex = section.rows - 1 - rowIndex
                          const rowLetter = String.fromCharCode(65 + actualRowIndex)
                          const sectionPrefix = section.name.charAt(0).toUpperCase()
                          const seatName = `${sectionPrefix}${rowLetter}${seatNumber}`
                          const seatId = `${section.name}-${rowLetter}-${seatNumber}`

                          const seat = sectionSeats.find(s =>
                            s.row === (actualRowIndex + 1).toString() &&
                            s.seat_number === seatNumber.toString()
                          ) || {
                            id: seatId,
                            section: section.name,
                            row: (actualRowIndex + 1).toString(),
                            seat_number: seatNumber.toString(),
                            price: section.price,
                            booked: false,
                            seatName: seatName
                          }

                          return (
                            <motion.button
                              key={seat.id}
                              onClick={() => toggleSeat(seat.id)}
                              disabled={seat.booked}
                              whileHover={{ scale: seat.booked ? 1 : 1.05 }}
                              whileTap={{ scale: seat.booked ? 1 : 0.95 }}
                              className={`w-10 h-8 rounded border-2 text-xs font-medium transition-all ${seat.booked
                                ? 'bg-red-100 border-red-400 text-red-600 cursor-not-allowed'
                                : selectedSeats.includes(seat.id)
                                  ? 'bg-green-100 border-green-400 text-green-700'
                                  : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100 hover:border-gray-400'
                                }`}
                              title={`${seatName} - ₹${section.price}`}
                            >
                              {seatNumber}
                            </motion.button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            {/* Central Stage */}
            <div className="flex flex-col items-center justify-center mx-2 sm:mx-4 lg:mx-8">
              <div className="w-24 h-24 sm:w-32 sm:h-32 lg:w-36 lg:h-36 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center text-white font-bold shadow-lg">
                <div className="text-center">
                  <div className="text-sm sm:text-lg lg:text-xl font-bold">KALARY</div>
                  <div className="text-xs sm:text-sm opacity-90">STAGE</div>
                </div>
              </div>
              <div className="text-center mt-2 sm:mt-3 text-xs text-gray-500">All eyes this way please</div>
            </div>

            {/* East Section */}
            {sections.filter((s: any) => s.name === 'East').map((section: any) => {
              const sectionSeats = seats.filter(s => s.section === section.name)
              return (
                <div key={section.name} className="flex flex-col items-center">
                  <div className="text-sm font-semibold text-gray-600 mb-4">
                    {section.name.toUpperCase()}
                  </div>
                  <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${section.rows}, 1fr)` }}>
                    {Array.from({ length: section.rows }, (_, rowIndex) =>
                      <div key={rowIndex} className="flex flex-col gap-1">
                        {Array.from({ length: section.seatsPerRow }, (_, seatIndex) => {
                          // For East section, show seats vertically in columns
                          const seatNumber = seatIndex + 1
                          const rowLetter = String.fromCharCode(65 + rowIndex)
                          const sectionPrefix = section.name.charAt(0).toUpperCase()
                          const seatName = `${sectionPrefix}${rowLetter}${seatNumber}`
                          const seatId = `${section.name}-${rowLetter}-${seatNumber}`

                          const seat = sectionSeats.find(s =>
                            s.row === (rowIndex + 1).toString() &&
                            s.seat_number === seatNumber.toString()
                          ) || {
                            id: seatId,
                            section: section.name,
                            row: (rowIndex + 1).toString(),
                            seat_number: seatNumber.toString(),
                            price: section.price,
                            booked: false,
                            seatName: seatName
                          }

                          return (
                            <motion.button
                              key={seat.id}
                              onClick={() => toggleSeat(seat.id)}
                              disabled={seat.booked}
                              whileHover={{ scale: seat.booked ? 1 : 1.05 }}
                              whileTap={{ scale: seat.booked ? 1 : 0.95 }}
                              className={`w-10 h-8 rounded border-2 text-xs font-medium transition-all ${seat.booked
                                ? 'bg-red-100 border-red-400 text-red-600 cursor-not-allowed'
                                : selectedSeats.includes(seat.id)
                                  ? 'bg-green-100 border-green-400 text-green-700'
                                  : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100 hover:border-gray-400'
                                }`}
                              title={`${seatName} - ₹${section.price}`}
                            >
                              {seatNumber}
                            </motion.button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* South Section */}
          {sections.filter((s: any) => s.name === 'South').map((section: any) => {
            const sectionSeats = seats.filter(s => s.section === section.name)
            return (
              <div key={section.name} className="text-center">
                <div className="text-sm font-semibold text-gray-600 mb-2">
                  {section.name.toUpperCase()}
                </div>
                <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${section.seatsPerRow}, 1fr)` }}>
                  {Array.from({ length: section.rows }, (_, rowIndex) =>
                    Array.from({ length: section.seatsPerRow }, (_, seatIndex) => {
                      const seatNumber = seatIndex + 1
                      const rowLetter = String.fromCharCode(65 + rowIndex)
                      const sectionPrefix = section.name.charAt(0).toUpperCase()
                      const seatName = `${sectionPrefix}${rowLetter}${seatNumber}`
                      const seatId = `${section.name}-${rowLetter}-${seatNumber}`

                      const seat = sectionSeats.find(s =>
                        s.row === (rowIndex + 1).toString() &&
                        s.seat_number === seatNumber.toString()
                      ) || {
                        id: seatId,
                        section: section.name,
                        row: (rowIndex + 1).toString(),
                        seat_number: seatNumber.toString(),
                        price: section.price,
                        booked: false,
                        seatName: seatName
                      }

                      return (
                        <motion.button
                          key={seat.id}
                          onClick={() => toggleSeat(seat.id)}
                          disabled={seat.booked}
                          whileHover={{ scale: seat.booked ? 1 : 1.05 }}
                          whileTap={{ scale: seat.booked ? 1 : 0.95 }}
                          className={`w-10 h-8 rounded border-2 text-xs font-medium transition-all ${seat.booked
                            ? 'bg-red-100 border-red-400 text-red-600 cursor-not-allowed'
                            : selectedSeats.includes(seat.id)
                              ? 'bg-green-100 border-green-400 text-green-700'
                              : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100 hover:border-gray-400'
                            }`}
                          title={`${seatName} - ₹${section.price}`}
                        >
                          {seatNumber}
                        </motion.button>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}

        </div>

        {/* Legend */}
        <div className="flex justify-center mt-6 space-x-6 text-sm">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-gray-50 border-2 border-gray-300 rounded mr-2"></div>
            <span className="text-gray-600">Available</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-green-100 border-2 border-green-400 rounded mr-2"></div>
            <span className="text-gray-600">Selected</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-red-100 border-2 border-red-400 rounded mr-2"></div>
            <span className="text-gray-600">Booked</span>
          </div>
        </div>
      </div>
    )
  }



  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Book Seats</h1>
        <p className="text-gray-600 mt-2">Select seats for Kalary shows</p>
      </div>

      {/* Show Selection */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Show</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {shows.map((show) => (
            <button
              key={show.id}
              onClick={() => setSelectedShow(show)}
              className={`p-4 rounded-xl border-2 text-left transition-colors ${selectedShow?.id === show.id
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-200 hover:border-gray-300'
                }`}
            >
              <div className="font-medium text-gray-900">{show.title}</div>
              <div className="text-sm text-gray-600">
                {format(new Date(show.date), 'MMM dd, yyyy')} at {show.time}
              </div>
              <div className="text-sm font-medium text-primary-600">₹{show.price}</div>
            </button>
          ))}
        </div>
      </div>

      {selectedShow && (
        <>
          {/* Seat Map */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                Select Seats - {selectedShow.title}
              </h2>
              {selectedSeats.length > 0 && (
                <div className="text-right">
                  <div className="text-sm text-gray-600">
                    {selectedSeats.length} seat(s) selected
                  </div>
                  <div className="text-lg font-bold text-primary-600">
                    ₹{getTotalAmount().toLocaleString()}
                  </div>
                </div>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
              </div>
            ) : (
              renderSeatMap()
            )}
          </div>

          {/* Booking Summary */}
          {selectedSeats.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Summary</h3>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span>Show:</span>
                  <span className="font-medium">{selectedShow.title}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date & Time:</span>
                  <span>{format(new Date(selectedShow.date), 'MMM dd, yyyy')} at {selectedShow.time}</span>
                </div>
                <div className="flex justify-between">
                  <span>Selected Seats:</span>
                  <span>{selectedSeats.map(seatId => {
                    const seat = seats.find(s => s.id === seatId)
                    return seat?.seatName || seatId
                  }).join(', ')}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total Amount:</span>
                  <span>₹{getTotalAmount().toLocaleString()}</span>
                </div>
              </div>

              <button
                onClick={handleBookSeats}
                disabled={loading}
                className="w-full bg-primary-600 text-white py-3 px-4 rounded-xl font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Booking...' : 'Confirm Booking & Generate Tickets'}
              </button>
            </div>
          )}
        </>
      )}

      {/* Success Modal */}
      {showConfirmation && bookingResult && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-gradient-to-br from-white to-slate-50 rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl border border-slate-200"
          >
            <div className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg"
              >
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </motion.div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Booking Successful!</h3>
              <p className="text-gray-600 mb-2">
                <span className="font-semibold text-green-600">{bookingResult.tickets?.length}</span> ticket(s) generated
              </p>
              <p className="text-sm text-gray-500 mb-8">
                Total Amount: <span className="font-bold text-gray-900">₹{bookingResult.totalAmount?.toLocaleString() || '0'}</span>
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setShowConfirmation(false)
                    window.location.href = '/tickets'
                  }}
                  className="w-full bg-gradient-to-r from-primary-600 to-primary-700 text-white py-4 px-6 rounded-2xl font-semibold hover:from-primary-700 hover:to-primary-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  View & Print Tickets
                </button>
                <button
                  onClick={() => setShowConfirmation(false)}
                  className="w-full bg-slate-100 text-slate-700 py-3 px-6 rounded-2xl font-medium hover:bg-slate-200 transition-colors"
                >
                  Continue Booking
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}

export default Booking