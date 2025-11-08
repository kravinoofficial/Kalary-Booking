import React, { useState, useEffect } from 'react'
import { supabase, Show, Customer } from '../lib/supabase'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { useDarkMode } from '../hooks/useDarkMode'
import { logBookingCreation } from '../utils/activityLogger'

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
  const [allShows, setAllShows] = useState<Show[]>([]) // Store all shows for filtering
  const [selectedShow, setSelectedShow] = useState<Show | null>(null)
  const [seats, setSeats] = useState<SeatData[]>([])
  const [selectedSeats, setSelectedSeats] = useState<string[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [bookingResult, setBookingResult] = useState<any>(null)
  const [selectedDate, setSelectedDate] = useState<string>('') // Date filter state
  const [customerSearchTerm, setCustomerSearchTerm] = useState('')
  const [submittingCustomer, setSubmittingCustomer] = useState(false)
  const darkMode = useDarkMode()

  // Filter customers based on search term
  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
    customer.email?.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
    customer.phone?.includes(customerSearchTerm)
  )

  const getSeatButtonClasses = (seat: SeatData, seatId: string) => {
    if (seat.booked) {
      return 'bg-red-100 border-red-400 text-red-600 cursor-not-allowed'
    }
    
    if (selectedSeats.includes(seatId)) {
      return 'bg-green-100 border-green-400 text-green-700'
    }
    
    return darkMode 
      ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600 hover:border-gray-500'
      : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100 hover:border-gray-400'
  }

  const getSectionHeaderClasses = () => {
    return `text-sm font-semibold mb-2 transition-colors duration-200 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`
  }

  useEffect(() => {
    fetchActiveShows()
    fetchCustomers()
  }, [])

  useEffect(() => {
    if (selectedShow) {
      fetchSeatsForShow(selectedShow.id)
    }
  }, [selectedShow])

  // Filter shows by selected date
  useEffect(() => {
    if (selectedDate) {
      const filteredShows = allShows.filter(show => show.date === selectedDate)
      setShows(filteredShows)
    } else {
      setShows(allShows) // Show all shows if no date selected
    }
    // Reset selected show if it's not in the filtered results
    if (selectedShow && selectedDate && selectedShow.date !== selectedDate) {
      setSelectedShow(null)
    }
  }, [selectedDate, allShows, selectedShow])

  // Get unique dates from all shows for quick selection
  const getAvailableDates = () => {
    const uniqueDates = new Set(allShows.map(show => show.date))
    const dates = Array.from(uniqueDates).sort()
    return dates
  }

  const fetchActiveShows = async () => {
    try {
      const { data, error } = await supabase
        .from('shows')
        .select(`
          *,
          layout:layouts(*)
        `)
        .in('status', ['ACTIVE', 'SHOW_STARTED'])
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date')

      if (error) throw error
      
      const updatedShows = await checkAndUpdateShowStatuses(data || [])
      const activeShows = updatedShows.filter(show => show.status === 'ACTIVE' || show.status === 'SHOW_STARTED')
      
      setAllShows(activeShows) // Store all shows
      setShows(activeShows) // Initially show all shows
    } catch (error) {
      console.error('Error fetching shows:', error)
    }
  }

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name')

      if (error) throw error
      setCustomers(data || [])
    } catch (error) {
      console.error('Error fetching customers:', error)
    }
  }

  const checkAndUpdateShowStatuses = async (shows: Show[]) => {
    const updatedShows = []
    
    for (const show of shows) {
      let updatedShow = { ...show }
      
      const showDateTime = new Date(`${show.date}T${show.time}`)
      const now = new Date()
      
      const thirtyMinutesAfterShow = new Date(showDateTime.getTime() + 30 * 60 * 1000)

      if (now > thirtyMinutesAfterShow && show.status !== 'SHOW_DONE') {
        try {
          console.log(`Updating show ${show.title} to SHOW_DONE and tickets to COMPLETED`)
          
          const { error: showError } = await supabase
            .from('shows')
            .update({ status: 'SHOW_DONE' })
            .eq('id', show.id)

          if (showError) {
            console.error('Error updating show status:', showError)
          } else {
            const { error: ticketError } = await supabase
              .from('tickets')
              .update({ status: 'COMPLETED' })
              .eq('show_id', show.id)
              .in('status', ['ACTIVE'])

            if (ticketError) {
              console.error('Error updating ticket status:', ticketError)
            } else {
              console.log(`Successfully updated tickets for show ${show.title} to COMPLETED`)
            }
          }
        } catch (error) {
          console.error(`Error processing show ${show.title}:`, error)
        }
        
        updatedShow.status = 'SHOW_DONE'
      } 
      else if (now > showDateTime && now <= thirtyMinutesAfterShow && show.status === 'ACTIVE') {
        try {
          console.log(`Updating show ${show.title} from ${show.status} to SHOW_STARTED`)
          
          const { error: showError } = await supabase
            .from('shows')
            .update({ status: 'SHOW_STARTED' })
            .eq('id', show.id)

          if (showError) {
            console.error('Error updating show status to SHOW_STARTED:', showError)
          } else {
            console.log(`Successfully updated show ${show.title} to SHOW_STARTED`)
          }
        } catch (error) {
          console.error(`Error processing show ${show.title}:`, error)
        }
        
        updatedShow.status = 'SHOW_STARTED'
      }
      else if (now > showDateTime && show.status === 'HOUSE_FULL') {
        try {
          console.log(`Updating HOUSE_FULL show ${show.title} directly to SHOW_DONE and tickets to COMPLETED`)
          
          const { error: showError } = await supabase
            .from('shows')
            .update({ status: 'SHOW_DONE' })
            .eq('id', show.id)

          if (showError) {
            console.error('Error updating show status:', showError)
          } else {
            const { error: ticketError } = await supabase
              .from('tickets')
              .update({ status: 'COMPLETED' })
              .eq('show_id', show.id)
              .in('status', ['ACTIVE'])

            if (ticketError) {
              console.error('Error updating ticket status:', ticketError)
            } else {
              console.log(`Successfully updated tickets for HOUSE_FULL show ${show.title} to COMPLETED`)
            }
          }
        } catch (error) {
          console.error(`Error processing show ${show.title}:`, error)
        }
        
        updatedShow.status = 'SHOW_DONE'
      } else if (show.status === 'ACTIVE') {
        const isHouseFull = await checkIfHouseFull(show)
        if (isHouseFull) {
          await supabase
            .from('shows')
            .update({ status: 'HOUSE_FULL' })
            .eq('id', show.id)
          updatedShow.status = 'HOUSE_FULL'
        }
      }
      
      updatedShows.push(updatedShow)
    }
    
    return updatedShows
  }

  const checkIfHouseFull = async (show: Show) => {
    try {
      if (!show.layout) return false
      
      const totalSeats = show.layout.structure.sections?.reduce((total: number, section: any) => {
        if (section.rows && Array.isArray(section.rows)) {
          return total + section.rows.reduce((sum: number, row: any) => sum + row.seats, 0)
        }
        return total + (section.rows * section.seatsPerRow || 0)
      }, 0) || 0
      
      const { data: bookings } = await supabase
        .from('bookings')
        .select('seat_code')
        .eq('show_id', show.id)
        .eq('status', 'CONFIRMED')
      
      const bookedSeatsCount = bookings?.reduce((count, booking) => {
        try {
          const seats = JSON.parse(booking.seat_code)
          return count + (Array.isArray(seats) ? seats.length : 1)
        } catch {
          return count + (booking.seat_code.includes(',') 
            ? booking.seat_code.split(',').length 
            : 1)
        }
      }, 0) || 0
      
      return bookedSeatsCount >= totalSeats
    } catch (error) {
      console.error('Error checking if house is full:', error)
      return false
    }
  }

  const fetchSeatsForShow = async (showId: string) => {
    setLoading(true)
    try {
      const show = shows.find(s => s.id === showId)
      if (!show?.layout) return

      const generatedSeats: SeatData[] = []

      show.layout.structure.sections?.forEach((section: any) => {
        const sectionPrefix = section.name.charAt(0).toUpperCase()
        
        if (section.rows && Array.isArray(section.rows)) {
          section.rows.forEach((rowConfig: any, rowIndex: number) => {
            const rowLetter = String.fromCharCode(65 + rowIndex)
            
            for (let seat = 1; seat <= rowConfig.seats; seat++) {
              const seatName = `${sectionPrefix}${rowLetter}${seat}`
              const seatId = `${section.name}-${rowLetter}-${seat}`
              generatedSeats.push({
                id: seatId,
                section: section.name,
                row: (rowIndex + 1).toString(),
                seat_number: seat.toString(),
                price: selectedShow?.price || 100,
                booked: false,
                seatName: seatName
              })
            }
          })
        } else {
          for (let row = 1; row <= (section.rows || 0); row++) {
            const rowLetter = String.fromCharCode(64 + row)

            for (let seat = 1; seat <= (section.seatsPerRow || 0); seat++) {
              const seatName = `${sectionPrefix}${rowLetter}${seat}`
              const seatId = `${section.name}-${rowLetter}-${seat}`
              generatedSeats.push({
                id: seatId,
                section: section.name,
                row: row.toString(),
                seat_number: seat.toString(),
                price: selectedShow?.price || 100,
                booked: false,
                seatName: seatName
              })
            }
          }
        }
      })

      const { data: bookings } = await supabase
        .from('bookings')
        .select('seat_code')
        .eq('show_id', showId)
        .eq('status', 'CONFIRMED')

      const bookedSeats = new Set<string>()
      bookings?.forEach(booking => {
        try {
          const seats = JSON.parse(booking.seat_code)
          if (Array.isArray(seats)) {
            seats.forEach(seat => bookedSeats.add(seat))
          } else {
            bookedSeats.add(booking.seat_code)
          }
        } catch {
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
    const uniformPrice = selectedShow?.price || 100
    return selectedSeats.length * uniformPrice
  }

  const handleContinueBooking = () => {
    if (!selectedShow || selectedSeats.length === 0) return
    setShowCustomerModal(true)
  }

  const handleBookSeats = async () => {
    if (!selectedShow || selectedSeats.length === 0 || !selectedCustomer) return

    try {
      setLoading(true)

      const { data: existingBookings, error: checkError } = await supabase
        .from('bookings')
        .select('seat_code')
        .eq('show_id', selectedShow.id)
        .eq('status', 'CONFIRMED')

      if (checkError) throw checkError

      if (existingBookings && existingBookings.length > 0) {
        const allBookedSeats = existingBookings.flatMap(booking => {
          try {
            return JSON.parse(booking.seat_code)
          } catch {
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

      const bookingToInsert = {
        show_id: selectedShow.id,
        seat_code: JSON.stringify(selectedSeats),
        booked_by: selectedCustomer.name,
        customer_id: selectedCustomer.id,
        booking_time: new Date().toISOString(),
        status: 'CONFIRMED'
      }

      const { data: bookings, error: bookingError } = await supabase
        .from('bookings')
        .insert([bookingToInsert])
        .select()

      if (bookingError) throw bookingError

      const booking = bookings[0]

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

      const { data: { user } } = await supabase.auth.getUser()
      const userEmail = user?.email || 'unknown'
      
      await logBookingCreation(
        booking.id,
        selectedShow.title,
        userEmail,
        {
          seat_codes: selectedSeats,
          seat_count: selectedSeats.length,
          total_price: getTotalAmount(),
          show_date: selectedShow.date,
          show_time: selectedShow.time,
          ticket_codes: tickets.map(t => t.ticket_code)
        }
      )

      setBookingResult({
        bookings,
        tickets,
        success: true,
        message: `Successfully booked ${selectedSeats.length} seat(s)`,
        totalAmount: getTotalAmount()
      })
      setShowConfirmation(true)
      setSelectedSeats([])

      fetchSeatsForShow(selectedShow.id)
    } catch (error) {
      console.error('Error booking seats:', error)
      alert(`Error booking seats: ${error instanceof Error ? error.message : 'Please try again.'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCustomerSelection = async () => {
    if (!selectedCustomer) {
      alert('Please select a customer to continue.')
      return
    }

    try {
      setSubmittingCustomer(true)
      
      // Close modal and proceed with booking
      setShowCustomerModal(false)
      
      // Proceed with booking
      await handleBookSeats()
      
    } catch (error) {
      console.error('Error handling customer selection:', error)
      alert('Error processing customer information. Please try again.')
    } finally {
      setSubmittingCustomer(false)
    }
  }

  // Helper function to render seats for a row
  const renderRowSeats = (section: any, rowConfig: any, rowIndex: number, sectionSeats: any[]) => {
    const rowLetter = String.fromCharCode(65 + rowIndex)
    const sectionPrefix = section.name.charAt(0).toUpperCase()
    
    return Array.from({ length: rowConfig.seats }, (_, seatIndex) => {
      const seatNumber = seatIndex + 1
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
        price: selectedShow?.price || 100,
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
          className={`w-7 h-6 sm:w-10 sm:h-8 rounded border text-[10px] sm:text-xs font-medium transition-all ${seat.booked
            ? 'bg-red-100 border-red-400 text-red-600 cursor-not-allowed'
            : selectedSeats.includes(seat.id)
              ? 'bg-green-100 border-green-400 text-green-700'
              : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100 hover:border-gray-400'
            }`}
          title={`${seatName} - ₹${selectedShow?.price || 100}`}
        >
          {seatNumber}
        </motion.button>
      )
    })
  }

  // Rectangular system view with center-aligned East/West sections
  const renderRectangularSeatMap = () => {
    if (!selectedShow?.layout) return null

    const sections = selectedShow.layout.structure.sections || []

    return (
      <div className={`rounded-2xl p-2 sm:p-6 w-full transition-colors duration-200 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        {/* Title */}
        <div className="text-center mb-4 sm:mb-6">
          <h3 className={`text-sm sm:text-lg font-bold transition-colors duration-200 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            KALARI THEATER - RECTANGULAR SYSTEM VIEW
          </h3>
          <div className={`text-xs sm:text-sm transition-colors duration-200 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Complete Seating Layout
          </div>
          {/* Mobile scroll hint */}
          <div className="sm:hidden mt-2 flex items-center justify-center gap-2 text-xs text-blue-500 animate-pulse">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
            </svg>
            <span>Swipe to view all seats</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </div>
        </div>

        {/* Horizontal scroll container for entire seat map on mobile */}
        <div className="overflow-x-auto -mx-2 sm:mx-0 px-2 sm:px-0">
          <div className="min-w-[650px] sm:min-w-0 max-w-7xl mx-auto">
            {/* Rectangular Grid Layout */}
            <div className="grid grid-cols-1 gap-4 sm:gap-8">
            
            {/* North Section - Top */}
            {sections.filter((s: any) => s.name === 'North').map((section: any) => {
              const sectionSeats = seats.filter(s => s.section === section.name)
              return (
                <div key={section.name} className="border-2 border-dashed border-blue-300 p-2 sm:p-4 rounded-lg">
                  <div className={`text-center text-sm sm:text-lg font-bold mb-2 sm:mb-4 transition-colors duration-200 ${darkMode ? 'text-blue-300' : 'text-blue-600'}`}>
                    NORTH SECTION
                  </div>
                  <div className="space-y-1 sm:space-y-2">
                    {Array.isArray(section.rows) ? (
                      section.rows.slice().reverse().map((rowConfig: any, reverseIndex: number) => {
                        const rowIndex = section.rows.length - 1 - reverseIndex
                        const rowLetter = String.fromCharCode(65 + rowIndex)
                        return (
                          <div key={rowIndex} className="flex justify-center gap-0.5 sm:gap-1">
                            <div className={`w-6 sm:w-8 text-xs font-bold flex items-center justify-center ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              {rowLetter}
                            </div>
                            {renderRowSeats(section, rowConfig, rowIndex, sectionSeats)}
                          </div>
                        )
                      })
                    ) : (
                      Array.from({ length: section.rows || 0 }, (_, rowIndex) => {
                        const actualRowIndex = (section.rows || 0) - 1 - rowIndex
                        const rowConfig = { seats: section.seatsPerRow || 0 }
                        const rowLetter = String.fromCharCode(65 + actualRowIndex)
                        return (
                          <div key={rowIndex} className="flex justify-center gap-0.5 sm:gap-1">
                            <div className={`w-6 sm:w-8 text-xs font-bold flex items-center justify-center ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              {rowLetter}
                            </div>
                            {renderRowSeats(section, rowConfig, actualRowIndex, sectionSeats)}
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )
            })}

            {/* Middle Row - West, Stage, East */}
            <div className="grid grid-cols-3 gap-2 sm:gap-6 items-center">
              
              {/* West Section - Left (Vertical Layout with Center Alignment) */}
              {sections.filter((s: any) => s.name === 'West').map((section: any) => {
                const sectionSeats = seats.filter(s => s.section === section.name)
                const maxSeatsInRow = Array.isArray(section.rows) 
                  ? Math.max(...section.rows.map((row: any) => row.seats))
                  : (section.seatsPerRow || 0)
                
                return (
                  <div key={section.name} className="border-2 border-dashed border-green-300 p-2 sm:p-4 rounded-lg">
                    <div className={`text-center text-sm sm:text-lg font-bold mb-2 sm:mb-4 transition-colors duration-200 ${darkMode ? 'text-green-300' : 'text-green-600'}`}>
                      WEST SECTION
                    </div>
                    <div className="flex gap-0.5 sm:gap-1 justify-center">
                      {Array.isArray(section.rows) ? (
                        [...section.rows].reverse().map((rowConfig: any, displayIndex: number) => {
                          const rowIndex = section.rows.length - 1 - displayIndex
                          const rowLetter = String.fromCharCode(65 + rowIndex)
                          const paddingTop = Math.floor((maxSeatsInRow - rowConfig.seats) / 2)
                          const paddingBottom = Math.ceil((maxSeatsInRow - rowConfig.seats) / 2)
                          
                          return (
                            <div key={rowIndex} className="flex flex-col items-center gap-1">
                              <div className={`text-xs font-bold mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                {rowLetter}
                              </div>
                              <div className="flex flex-col gap-1 justify-center" style={{ minHeight: `${maxSeatsInRow * 2.5}rem` }}>
                                {/* Top padding for center alignment */}
                                {Array.from({ length: paddingTop }, (_, i) => (
                                  <div key={`pad-top-${i}`} className="w-8 h-8"></div>
                                ))}
                                
                                {/* Actual seats */}
                                {Array.from({ length: rowConfig.seats }, (_, seatIndex) => {
                                  const seatNumber = seatIndex + 1
                                  const seatName = `W${rowLetter}${seatNumber}`
                                  const seatId = `${section.name}-${rowLetter}-${seatNumber}`

                                  const seat = sectionSeats.find(s =>
                                    s.row === (rowIndex + 1).toString() &&
                                    s.seat_number === seatNumber.toString()
                                  ) || {
                                    id: seatId,
                                    section: section.name,
                                    row: (rowIndex + 1).toString(),
                                    seat_number: seatNumber.toString(),
                                    price: selectedShow?.price || 100,
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
                                      className={`w-8 h-8 rounded border-2 text-xs font-medium transition-all ${seat.booked
                                        ? 'bg-red-100 border-red-400 text-red-600 cursor-not-allowed'
                                        : selectedSeats.includes(seat.id)
                                          ? 'bg-green-100 border-green-400 text-green-700'
                                          : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100 hover:border-gray-400'
                                        }`}
                                      title={`${seatName} - ₹${selectedShow?.price || 100}`}
                                    >
                                      {seatNumber}
                                    </motion.button>
                                  )
                                })}
                                
                                {/* Bottom padding for center alignment */}
                                {Array.from({ length: paddingBottom }, (_, i) => (
                                  <div key={`pad-bottom-${i}`} className="w-8 h-8"></div>
                                ))}
                              </div>
                            </div>
                          )
                        })
                      ) : (
                        Array.from({ length: section.rows || 0 }, (_, displayIndex) => {
                          const rowIndex = (section.rows || 0) - 1 - displayIndex
                          const rowLetter = String.fromCharCode(65 + rowIndex)
                          const paddingTop = Math.floor((maxSeatsInRow - (section.seatsPerRow || 0)) / 2)
                          const paddingBottom = Math.ceil((maxSeatsInRow - (section.seatsPerRow || 0)) / 2)
                          
                          return (
                            <div key={rowIndex} className="flex flex-col items-center gap-1">
                              <div className={`text-xs font-bold mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                {rowLetter}
                              </div>
                              <div className="flex flex-col gap-1 justify-center" style={{ minHeight: `${maxSeatsInRow * 2.5}rem` }}>
                                {/* Top padding for center alignment */}
                                {Array.from({ length: paddingTop }, (_, i) => (
                                  <div key={`pad-top-${i}`} className="w-8 h-8"></div>
                                ))}
                                
                                {/* Actual seats */}
                                {Array.from({ length: section.seatsPerRow || 0 }, (_, seatIndex) => {
                                  const seatNumber = seatIndex + 1
                                  const seatName = `W${rowLetter}${seatNumber}`
                                  const seatId = `${section.name}-${rowLetter}-${seatNumber}`

                                  const seat = sectionSeats.find(s =>
                                    s.row === (rowIndex + 1).toString() &&
                                    s.seat_number === seatNumber.toString()
                                  ) || {
                                    id: seatId,
                                    section: section.name,
                                    row: (rowIndex + 1).toString(),
                                    seat_number: seatNumber.toString(),
                                    price: selectedShow?.price || 100,
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
                                      className={`w-8 h-8 rounded border-2 text-xs font-medium transition-all ${seat.booked
                                        ? 'bg-red-100 border-red-400 text-red-600 cursor-not-allowed'
                                        : selectedSeats.includes(seat.id)
                                          ? 'bg-green-100 border-green-400 text-green-700'
                                          : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100 hover:border-gray-400'
                                        }`}
                                      title={`${seatName} - ₹${selectedShow?.price || 100}`}
                                    >
                                      {seatNumber}
                                    </motion.button>
                                  )
                                })}
                                
                                {/* Bottom padding for center alignment */}
                                {Array.from({ length: paddingBottom }, (_, i) => (
                                  <div key={`pad-bottom-${i}`} className="w-8 h-8"></div>
                                ))}
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                )
              })}

              {/* Central Stage */}
              <div className="flex flex-col items-center justify-center p-2 sm:p-8">
                <div className="w-20 h-20 sm:w-32 sm:h-32 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl sm:rounded-2xl flex items-center justify-center text-white font-bold shadow-lg mb-2 sm:mb-4">
                  <div className="text-center">
                    <div className="text-sm sm:text-xl font-bold">Kalari</div>
                    <div className="text-xs sm:text-sm opacity-90">STAGE</div>
                  </div>
                </div>
                <div className={`text-center text-xs transition-colors duration-200 ${darkMode ? 'text-gray-400' : 'text-gray-500'} hidden sm:block`}>
                  All eyes this way please
                </div>
              </div>

              {/* East Section - Right (Vertical Layout with Center Alignment) */}
              {sections.filter((s: any) => s.name === 'East').map((section: any) => {
                const sectionSeats = seats.filter(s => s.section === section.name)
                const maxSeatsInRow = Array.isArray(section.rows) 
                  ? Math.max(...section.rows.map((row: any) => row.seats))
                  : (section.seatsPerRow || 0)
                
                return (
                  <div key={section.name} className="border-2 border-dashed border-purple-300 p-4 rounded-lg">
                    <div className={`text-center text-lg font-bold mb-4 transition-colors duration-200 ${darkMode ? 'text-purple-300' : 'text-purple-600'}`}>
                      EAST SECTION
                    </div>
                    <div className="flex gap-1 justify-center">
                      {Array.isArray(section.rows) ? (
                        section.rows.map((rowConfig: any, rowIndex: number) => {
                          const rowLetter = String.fromCharCode(65 + rowIndex)
                          const paddingTop = Math.floor((maxSeatsInRow - rowConfig.seats) / 2)
                          const paddingBottom = Math.ceil((maxSeatsInRow - rowConfig.seats) / 2)
                          
                          return (
                            <div key={rowIndex} className="flex flex-col items-center gap-1">
                              <div className={`text-xs font-bold mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                {rowLetter}
                              </div>
                              <div className="flex flex-col gap-1 justify-center" style={{ minHeight: `${maxSeatsInRow * 2.5}rem` }}>
                                {/* Top padding for center alignment */}
                                {Array.from({ length: paddingTop }, (_, i) => (
                                  <div key={`pad-top-${i}`} className="w-8 h-8"></div>
                                ))}
                                
                                {/* Actual seats */}
                                {Array.from({ length: rowConfig.seats }, (_, seatIndex) => {
                                  const seatNumber = seatIndex + 1
                                  const seatName = `E${rowLetter}${seatNumber}`
                                  const seatId = `${section.name}-${rowLetter}-${seatNumber}`

                                  const seat = sectionSeats.find(s =>
                                    s.row === (rowIndex + 1).toString() &&
                                    s.seat_number === seatNumber.toString()
                                  ) || {
                                    id: seatId,
                                    section: section.name,
                                    row: (rowIndex + 1).toString(),
                                    seat_number: seatNumber.toString(),
                                    price: selectedShow?.price || 100,
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
                                      className={`w-8 h-8 rounded border-2 text-xs font-medium transition-all ${seat.booked
                                        ? 'bg-red-100 border-red-400 text-red-600 cursor-not-allowed'
                                        : selectedSeats.includes(seat.id)
                                          ? 'bg-green-100 border-green-400 text-green-700'
                                          : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100 hover:border-gray-400'
                                        }`}
                                      title={`${seatName} - ₹${selectedShow?.price || 100}`}
                                    >
                                      {seatNumber}
                                    </motion.button>
                                  )
                                })}
                                
                                {/* Bottom padding for center alignment */}
                                {Array.from({ length: paddingBottom }, (_, i) => (
                                  <div key={`pad-bottom-${i}`} className="w-8 h-8"></div>
                                ))}
                              </div>
                            </div>
                          )
                        })
                      ) : (
                        Array.from({ length: section.rows || 0 }, (_, rowIndex) => {
                          const rowLetter = String.fromCharCode(65 + rowIndex)
                          const paddingTop = Math.floor((maxSeatsInRow - (section.seatsPerRow || 0)) / 2)
                          const paddingBottom = Math.ceil((maxSeatsInRow - (section.seatsPerRow || 0)) / 2)
                          
                          return (
                            <div key={rowIndex} className="flex flex-col items-center gap-1">
                              <div className={`text-xs font-bold mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                {rowLetter}
                              </div>
                              <div className="flex flex-col gap-1 justify-center" style={{ minHeight: `${maxSeatsInRow * 2.5}rem` }}>
                                {/* Top padding for center alignment */}
                                {Array.from({ length: paddingTop }, (_, i) => (
                                  <div key={`pad-top-${i}`} className="w-8 h-8"></div>
                                ))}
                                
                                {/* Actual seats */}
                                {Array.from({ length: section.seatsPerRow || 0 }, (_, seatIndex) => {
                                  const seatNumber = seatIndex + 1
                                  const seatName = `E${rowLetter}${seatNumber}`
                                  const seatId = `${section.name}-${rowLetter}-${seatNumber}`

                                  const seat = sectionSeats.find(s =>
                                    s.row === (rowIndex + 1).toString() &&
                                    s.seat_number === seatNumber.toString()
                                  ) || {
                                    id: seatId,
                                    section: section.name,
                                    row: (rowIndex + 1).toString(),
                                    seat_number: seatNumber.toString(),
                                    price: selectedShow?.price || 100,
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
                                      className={`w-8 h-8 rounded border-2 text-xs font-medium transition-all ${seat.booked
                                        ? 'bg-red-100 border-red-400 text-red-600 cursor-not-allowed'
                                        : selectedSeats.includes(seat.id)
                                          ? 'bg-green-100 border-green-400 text-green-700'
                                          : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100 hover:border-gray-400'
                                        }`}
                                      title={`${seatName} - ₹${selectedShow?.price || 100}`}
                                    >
                                      {seatNumber}
                                    </motion.button>
                                  )
                                })}
                                
                                {/* Bottom padding for center alignment */}
                                {Array.from({ length: paddingBottom }, (_, i) => (
                                  <div key={`pad-bottom-${i}`} className="w-8 h-8"></div>
                                ))}
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* South Section - Bottom */}
            {sections.filter((s: any) => s.name === 'South').map((section: any) => {
              const sectionSeats = seats.filter(s => s.section === section.name)
              return (
                <div key={section.name} className="border-2 border-dashed border-orange-300 p-4 rounded-lg">
                  <div className={`text-center text-lg font-bold mb-4 transition-colors duration-200 ${darkMode ? 'text-orange-300' : 'text-orange-600'}`}>
                    SOUTH SECTION
                  </div>
                  <div className="space-y-2">
                    {Array.isArray(section.rows) ? (
                      section.rows.map((rowConfig: any, rowIndex: number) => {
                        const rowLetter = String.fromCharCode(65 + rowIndex)
                        return (
                          <div key={rowIndex} className="flex justify-center gap-1">
                            <div className={`w-8 text-xs font-bold flex items-center justify-center ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              {rowLetter}
                            </div>
                            {renderRowSeats(section, rowConfig, rowIndex, sectionSeats)}
                          </div>
                        )
                      })
                    ) : (
                      Array.from({ length: section.rows || 0 }, (_, rowIndex) => {
                        const rowConfig = { seats: section.seatsPerRow || 0 }
                        const rowLetter = String.fromCharCode(65 + rowIndex)
                        return (
                          <div key={rowIndex} className="flex justify-center gap-1">
                            <div className={`w-8 text-xs font-bold flex items-center justify-center ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              {rowLetter}
                            </div>
                            {renderRowSeats(section, rowConfig, rowIndex, sectionSeats)}
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )
            })}
            </div>

            {/* Legend */}
            <div className="flex justify-center mt-8 space-x-6 text-sm">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-gray-50 border-2 border-gray-300 rounded mr-2"></div>
                <span className={`transition-colors duration-200 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Available</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-green-100 border-2 border-green-400 rounded mr-2"></div>
                <span className={`transition-colors duration-200 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Selected</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-red-100 border-2 border-red-400 rounded mr-2"></div>
                <span className={`transition-colors duration-200 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Booked</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className={`text-2xl sm:text-3xl font-medium transition-colors duration-200 ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>Book Seats</h1>
        <p className={`mt-2 text-sm sm:text-base transition-colors duration-200 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Select seats for Kalari shows</p>
      </div>

      {/* Date Filter */}
      <div className={`rounded-2xl shadow-sm border p-6 mb-6 transition-colors duration-200 ${darkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'}`}>
        <h2 className={`text-lg font-medium mb-4 transition-colors duration-200 ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>Filter by Date</h2>
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="flex-1">
            <label className={`block text-sm font-medium mb-2 transition-colors duration-200 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              Select Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]} // Prevent selecting past dates
              className={`w-full px-4 py-2 rounded-lg border transition-colors duration-200 ${
                darkMode 
                  ? 'bg-slate-800 border-slate-600 text-slate-100 focus:border-slate-500' 
                  : 'bg-white border-slate-300 text-slate-900 focus:border-slate-400'
              } focus:outline-none focus:ring-2 focus:ring-primary-500/20`}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedDate('')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                darkMode
                  ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Clear Filter
            </button>
            <button
              onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                darkMode
                  ? 'bg-primary-600 text-white hover:bg-primary-700'
                  : 'bg-primary-600 text-white hover:bg-primary-700'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => {
                const tomorrow = new Date()
                tomorrow.setDate(tomorrow.getDate() + 1)
                setSelectedDate(tomorrow.toISOString().split('T')[0])
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                darkMode
                  ? 'bg-slate-600 text-white hover:bg-slate-500'
                  : 'bg-slate-600 text-white hover:bg-slate-500'
              }`}
            >
              Tomorrow
            </button>
          </div>
        </div>
        
        {/* Available dates quick selector - Hidden on mobile */}
        {getAvailableDates().length > 0 && (
          <div className="mt-4 hidden sm:block">
            <label className={`block text-sm font-medium mb-2 transition-colors duration-200 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              Quick Select Available Dates
            </label>
            <div className="flex flex-wrap gap-2">
              {getAvailableDates().slice(0, 7).map((date) => (
                <button
                  key={date}
                  onClick={() => setSelectedDate(date)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors duration-200 ${
                    selectedDate === date
                      ? darkMode
                        ? 'bg-primary-600 text-white'
                        : 'bg-primary-600 text-white'
                      : darkMode
                        ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {format(new Date(date), 'MMM dd')}
                </button>
              ))}
              {getAvailableDates().length > 7 && (
                <span className={`px-3 py-1 text-sm transition-colors duration-200 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  +{getAvailableDates().length - 7} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Show count and selected date info */}
        <div className="mt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div className={`text-sm transition-colors duration-200 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            {selectedDate ? (
              <>Showing {shows.length} show(s) for {format(new Date(selectedDate), 'MMM dd, yyyy')}</>
            ) : (
              <>Showing {shows.length} show(s) (all dates)</>
            )}
          </div>
          {selectedDate && (
            <div className={`text-xs px-2 py-1 rounded-full transition-colors duration-200 ${
              darkMode ? 'bg-primary-900/50 text-primary-300' : 'bg-primary-100 text-primary-700'
            }`}>
              Filtered by: {format(new Date(selectedDate), 'MMM dd, yyyy')}
            </div>
          )}
        </div>
      </div>

      {/* Show Selection */}
      <div className={`rounded-2xl shadow-sm border p-6 mb-6 transition-colors duration-200 ${darkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'}`}>
        <h2 className={`text-lg font-medium mb-4 transition-colors duration-200 ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
          Select Show {selectedDate && `(${format(new Date(selectedDate), 'MMM dd, yyyy')})`}
        </h2>
        
        {shows.length === 0 ? (
          <div className={`text-center py-8 transition-colors duration-200 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            {selectedDate ? (
              <>
                <div className="text-lg mb-2">No shows available for {format(new Date(selectedDate), 'MMM dd, yyyy')}</div>
                <div className="text-sm">Try selecting a different date or clear the filter to see all shows.</div>
              </>
            ) : (
              <>
                <div className="text-lg mb-2">No shows available</div>
                <div className="text-sm">Please check back later for upcoming shows.</div>
              </>
            )}
          </div>
        ) : null}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {shows.map((show) => (
            <button
              key={show.id}
              onClick={() => setSelectedShow(show)}
              className={`p-4 rounded-xl border-2 text-left transition-all duration-200 ${selectedShow?.id === show.id
                ? darkMode 
                  ? 'border-slate-600 bg-slate-800 shadow-sm' 
                  : 'border-slate-300 bg-slate-50 shadow-sm'
                : darkMode
                  ? 'border-slate-700 hover:border-slate-600 bg-slate-800/50 hover:bg-slate-800'
                  : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
                }`}
            >
              <div className={`font-medium transition-colors duration-200 ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{show.title}</div>
              <div className={`text-sm transition-colors duration-200 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                {format(new Date(show.date), 'MMM dd, yyyy')} at {format(new Date(`2000-01-01T${show.time}`), 'h:mm a')}
              </div>
              <div className={`text-sm font-medium transition-colors duration-200 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>₹{show.price}</div>
            </button>
          ))}
        </div>
      </div>

      {selectedShow && (
        <>
          {/* Seat Map */}
          <div className={`rounded-2xl shadow-sm border p-6 mb-6 transition-colors duration-200 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex justify-between items-center mb-6">
              <h2 className={`text-lg font-semibold transition-colors duration-200 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Select Seats - {selectedShow.title}
              </h2>
              {selectedSeats.length > 0 && (
                <div className="text-right">
                  <div className={`text-sm transition-colors duration-200 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
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
              renderRectangularSeatMap()
            )}
          </div>

          {/* Booking Summary */}
          {selectedSeats.length > 0 && (
            <div className={`rounded-2xl shadow-sm border p-6 transition-colors duration-200 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <h3 className={`text-lg font-semibold mb-4 transition-colors duration-200 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Booking Summary</h3>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span className={`transition-colors duration-200 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Show:</span>
                  <span className={`font-medium transition-colors duration-200 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{selectedShow.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className={`transition-colors duration-200 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Date & Time:</span>
                  <span className={`transition-colors duration-200 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{format(new Date(selectedShow.date), 'MMM dd, yyyy')} at {format(new Date(`2000-01-01T${selectedShow.time}`), 'h:mm a')}</span>
                </div>
                <div className="flex justify-between">
                  <span className={`transition-colors duration-200 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Selected Seats:</span>
                  <span className={`transition-colors duration-200 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{selectedSeats.map(seatId => {
                    const seat = seats.find(s => s.id === seatId)
                    return seat?.seatName || seatId
                  }).join(', ')}</span>
                </div>
                <div className={`flex justify-between text-lg font-bold border-t pt-2 transition-colors duration-200 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <span className={`transition-colors duration-200 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Total Amount:</span>
                  <span className={`transition-colors duration-200 ${darkMode ? 'text-white' : 'text-gray-900'}`}>₹{getTotalAmount().toLocaleString()}</span>
                </div>
              </div>

              <button
                onClick={handleContinueBooking}
                disabled={loading}
                className="w-full bg-primary-600 text-white py-3 px-4 rounded-xl font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Continue Booking'}
              </button>
            </div>
          )}
        </>
      )}

      {/* Success Modal */}
      {showConfirmation && bookingResult && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 backdrop-blur-sm p-4 overflow-hidden">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className={`rounded-3xl p-4 sm:p-8 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl border transition-colors duration-200 ${darkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700' : 'bg-gradient-to-br from-white to-slate-50 border-slate-200'}`}
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
              <h3 className={`text-2xl font-bold mb-3 transition-colors duration-200 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Booking Successful!</h3>
              
              {/* Customer Information */}
              {selectedCustomer && (
                <div className={`mb-6 p-4 rounded-xl ${darkMode ? 'bg-slate-800/30 border border-slate-700' : 'bg-gray-50 border border-gray-200'}`}>
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mr-4 shadow-lg">
                      <span className="text-white font-bold text-lg">
                        {selectedCustomer.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className={`font-semibold text-base ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                        Booked by: {selectedCustomer.name}
                      </div>
                      {selectedCustomer.email && (
                        <div className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                          {selectedCustomer.email}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              <p className={`mb-2 transition-colors duration-200 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                <span className="font-semibold text-green-600">{bookingResult.tickets?.length}</span> ticket(s) generated
              </p>
              
              {/* Show Details */}
              {selectedShow && (
                <div className={`mb-4 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  <div>Show: <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{selectedShow.title}</span></div>
                  <div>Date: <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{format(new Date(selectedShow.date), 'MMM dd, yyyy')} at {format(new Date(`2000-01-01T${selectedShow.time}`), 'h:mm a')}</span></div>
                </div>
              )}
              
              <p className={`text-sm mb-8 transition-colors duration-200 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                Total Amount: <span className={`font-bold transition-colors duration-200 ${darkMode ? 'text-white' : 'text-gray-900'}`}>₹{bookingResult.totalAmount?.toLocaleString() || '0'}</span>
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
                  className={`w-full py-3 px-6 rounded-2xl font-medium transition-colors ${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                >
                  Continue Booking
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Customer Selection Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 backdrop-blur-sm p-4 overflow-hidden">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className={`rounded-2xl p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl border transition-colors duration-200 ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-xl font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                Select Customer
              </h2>
              <button
                onClick={() => {
                  setShowCustomerModal(false)
                  setSelectedCustomer(null)
                  setCustomerSearchTerm('')
                }}
                className={`p-2 rounded-lg transition-colors duration-200 ${darkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              {/* Search Customer */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Search Customer
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by name, email, or phone..."
                    value={customerSearchTerm}
                    onChange={(e) => setCustomerSearchTerm(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2 rounded-lg border transition-colors duration-200 ${
                      darkMode 
                        ? 'bg-slate-800 border-slate-600 text-slate-100 focus:border-slate-500' 
                        : 'bg-white border-slate-300 text-slate-900 focus:border-slate-400'
                    } focus:outline-none focus:ring-2 focus:ring-primary-500/20`}
                  />
                  <svg className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              {/* Customer List */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Select Customer
                </label>
                <div className={`max-h-60 overflow-y-auto border rounded-lg ${darkMode ? 'border-slate-600' : 'border-slate-300'}`}>
                  {filteredCustomers.length === 0 ? (
                    <div className="p-4 text-center">
                      <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        {customerSearchTerm ? 'No customers found matching your search.' : 'No customers available.'}
                      </p>
                      <p className={`text-sm mt-1 ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                        Please add customers from the <a href="/customers" className="text-primary-600 hover:text-primary-700">Customers page</a> first.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-200 dark:divide-slate-700">
                      {filteredCustomers.map((customer) => (
                        <button
                          key={customer.id}
                          onClick={() => setSelectedCustomer(customer)}
                          className={`w-full p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors duration-200 ${
                            selectedCustomer?.id === customer.id 
                              ? 'bg-primary-50 dark:bg-primary-900/20 border-l-4 border-primary-500' 
                              : ''
                          }`}
                        >
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                              <span className="text-white font-medium text-sm">
                                {customer.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className={`font-medium ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                                {customer.name}
                              </div>
                              <div className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                {customer.email || customer.phone || 'No contact info'}
                              </div>
                            </div>
                            {selectedCustomer?.id === customer.id && (
                              <div className="text-primary-600">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Selected Customer Info */}
              {selectedCustomer && (
                <div className={`p-3 rounded-lg border ${darkMode ? 'bg-slate-800 border-slate-600' : 'bg-slate-50 border-slate-300'}`}>
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                      <span className="text-white font-medium text-sm">
                        {selectedCustomer.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className={`text-sm font-medium ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                        Selected: {selectedCustomer.name}
                      </div>
                      {selectedCustomer.email && (
                        <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                          {selectedCustomer.email}
                        </div>
                      )}
                      {selectedCustomer.phone && (
                        <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                          {selectedCustomer.phone}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => {
                    setShowCustomerModal(false)
                    setSelectedCustomer(null)
                    setCustomerSearchTerm('')
                  }}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors duration-200 ${darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCustomerSelection}
                  disabled={submittingCustomer || !selectedCustomer}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors duration-200 ${
                    submittingCustomer || !selectedCustomer
                      ? 'opacity-50 cursor-not-allowed' 
                      : 'hover:bg-primary-700'
                  } bg-primary-600 text-white`}
                >
                  {submittingCustomer ? 'Processing...' : 'Confirm Booking'}
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