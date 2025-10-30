import React, { useState, useEffect } from 'react'
import { supabase, Show, Layout } from '../lib/supabase'
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import { format } from 'date-fns'
import { useDarkMode } from '../hooks/useDarkMode'
import { logShowDeletion, logShowCreation, logShowUpdate } from '../utils/activityLogger'

const Shows: React.FC = () => {
  const [shows, setShows] = useState<Show[]>([])
  const [allShows, setAllShows] = useState<Show[]>([]) // Store all shows for filtering
  const [layouts, setLayouts] = useState<Layout[]>([])
  const [loading, setLoading] = useState(true)
  const darkMode = useDarkMode()
  const [showModal, setShowModal] = useState(false)
  const [editingShow, setEditingShow] = useState<Show | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>('') // Date filter state
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    time: '',
    price: '',
    description: '',
    layout_id: ''
  })

  useEffect(() => {
    fetchShows()
    fetchLayouts()
  }, [])

  // Filter shows by selected date
  useEffect(() => {
    if (selectedDate) {
      const filteredShows = allShows.filter(show => show.date === selectedDate)
      setShows(filteredShows)
    } else {
      setShows(allShows) // Show all shows if no date selected
    }
  }, [selectedDate, allShows])

  const fetchShows = async () => {
    try {
      const { data, error } = await supabase
        .from('shows')
        .select(`
          *,
          layout:layouts(*)
        `)
        .order('date', { ascending: false })

      if (error) throw error

      // Check and update show statuses automatically
      if (data) {
        await checkAndUpdateShowStatuses(data)
        // Fetch again to get updated statuses
        const { data: updatedData } = await supabase
          .from('shows')
          .select(`
            *,
            layout:layouts(*)
          `)
          .order('date', { ascending: false })
        setAllShows(updatedData || []) // Store all shows
        setShows(updatedData || []) // Initially show all shows
      } else {
        setAllShows([])
        setShows([])
      }
    } catch (error) {
      console.error('Error fetching shows:', error)
    } finally {
      setLoading(false)
    }
  }

  const checkAndUpdateShowStatuses = async (shows: Show[]) => {
    for (const show of shows) {
      try {
        // Check if show is completed (current time is past show date + time)
        const showDateTime = new Date(`${show.date}T${show.time}`)
        const now = new Date()

        console.log(`Checking show ${show.title}: Show time: ${showDateTime}, Current time: ${now}, Status: ${show.status}`)

        const thirtyMinutesAfterShow = new Date(showDateTime.getTime() + 30 * 60 * 1000) // Add 30 minutes

        // Check if show is done (30 minutes after show start time)
        if (now > thirtyMinutesAfterShow && show.status !== 'SHOW_DONE') {
          console.log(`Updating show ${show.title} to SHOW_DONE and tickets to COMPLETED`)

          // Update show to SHOW_DONE
          const { error: showError } = await supabase
            .from('shows')
            .update({ status: 'SHOW_DONE' })
            .eq('id', show.id)

          if (showError) {
            console.error('Error updating show status:', showError)
            continue
          }

          // Update all tickets for this show to COMPLETED status
          const { error: ticketError } = await supabase
            .from('tickets')
            .update({ status: 'COMPLETED' })
            .eq('show_id', show.id)
            .in('status', ['ACTIVE']) // Update ACTIVE tickets

          if (ticketError) {
            console.error('Error updating ticket status:', ticketError)
          } else {
            console.log(`Successfully updated tickets for show ${show.title} to COMPLETED`)
          }
        }
        // Check if show has started (current time is past show start time but less than 30 minutes)
        else if (now > showDateTime && now <= thirtyMinutesAfterShow && show.status === 'ACTIVE') {
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
        }
        // Check if HOUSE_FULL show should go directly to SHOW_DONE when show time passes
        else if (now > showDateTime && show.status === 'HOUSE_FULL') {
          console.log(`Updating HOUSE_FULL show ${show.title} directly to SHOW_DONE and tickets to COMPLETED`)

          // Update show to SHOW_DONE
          const { error: showError } = await supabase
            .from('shows')
            .update({ status: 'SHOW_DONE' })
            .eq('id', show.id)

          if (showError) {
            console.error('Error updating show status:', showError)
            continue
          }

          // Update all tickets for this show to COMPLETED status
          const { error: ticketError } = await supabase
            .from('tickets')
            .update({ status: 'COMPLETED' })
            .eq('show_id', show.id)
            .in('status', ['ACTIVE']) // Update ACTIVE tickets

          if (ticketError) {
            console.error('Error updating ticket status:', ticketError)
          } else {
            console.log(`Successfully updated tickets for HOUSE_FULL show ${show.title} to COMPLETED`)
          }
        }
        // Check if house is full for ACTIVE shows
        else if (show.status === 'ACTIVE') {
          // Check if house is full
          const isHouseFull = await checkIfHouseFull(show)
          if (isHouseFull) {
            await supabase
              .from('shows')
              .update({ status: 'HOUSE_FULL' })
              .eq('id', show.id)
          }
        }
      } catch (error) {
        console.error(`Error processing show ${show.title}:`, error)
      }
    }
  }

  const checkIfHouseFull = async (show: Show) => {
    try {
      if (!show.layout) return false

      // Calculate total seats from layout (support both new and old formats)
      const totalSeats = show.layout.structure.sections?.reduce((total: number, section: any) => {
        if (section.rows && Array.isArray(section.rows)) {
          // New format with individual row configuration
          return total + section.rows.reduce((sum: number, row: any) => sum + row.seats, 0)
        }
        // Fallback for old format
        return total + (section.rows * section.seatsPerRow || 0)
      }, 0) || 0

      console.log(`Checking house full for show ${show.title}: Total seats = ${totalSeats}`)

      // Count booked seats
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

      console.log(`Booked seats: ${bookedSeatsCount}, Total seats: ${totalSeats}, Is house full: ${bookedSeatsCount >= totalSeats}`)

      return bookedSeatsCount >= totalSeats
    } catch (error) {
      console.error('Error checking if house is full:', error)
      return false
    }
  }

  const fetchLayouts = async () => {
    try {
      const { data, error } = await supabase
        .from('layouts')
        .select('*')
        .order('name')

      if (error) throw error
      setLayouts(data || [])
    } catch (error) {
      console.error('Error fetching layouts:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const showData = {
        title: formData.title,
        date: formData.date,
        time: formData.time,
        price: parseFloat(formData.price),
        description: formData.description,
        layout_id: formData.layout_id
      }

      // Get current user email
      const { data: { user } } = await supabase.auth.getUser()
      const userEmail = user?.email || 'unknown'

      if (editingShow) {
        // Capture changes before update
        const changes: any = {}
        if (editingShow.title !== showData.title) {
          changes.title = { from: editingShow.title, to: showData.title }
        }
        if (editingShow.date !== showData.date) {
          changes.date = { from: editingShow.date, to: showData.date }
        }
        if (editingShow.time !== showData.time) {
          changes.time = { from: editingShow.time, to: showData.time }
        }
        if (editingShow.price !== showData.price) {
          changes.price = { from: editingShow.price, to: showData.price }
        }
        if (editingShow.description !== showData.description) {
          changes.description = { from: editingShow.description || '', to: showData.description }
        }

        const { error } = await supabase
          .from('shows')
          .update(showData)
          .eq('id', editingShow.id)

        if (error) throw error

        // Log the show update with changes
        await logShowUpdate(
          editingShow.id,
          showData.title,
          userEmail,
          {
            changes: changes,
            fieldsChanged: Object.keys(changes),
            updated_at: new Date().toISOString()
          }
        )
      } else {
        const { data: newShow, error } = await supabase
          .from('shows')
          .insert([showData])
          .select()
          .single()

        if (error) throw error

        // Log the show creation
        if (newShow) {
          await logShowCreation(
            newShow.id,
            showData.title,
            userEmail,
            {
              date: showData.date,
              time: showData.time,
              price: showData.price,
              description: showData.description,
              created_at: new Date().toISOString()
            }
          )
        }
      }

      setShowModal(false)
      setEditingShow(null)
      resetForm()
      await fetchShows() // Refresh the shows list
    } catch (error) {
      console.error('Error saving show:', error)
    }
  }

  const handleEdit = (show: Show) => {
    setEditingShow(show)
    setFormData({
      title: show.title,
      date: show.date,
      time: show.time,
      price: show.price.toString(),
      description: show.description || '',
      layout_id: show.layout_id
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this show?')) {
      try {
        // Get show details before deletion for logging
        const { data: showToDelete } = await supabase
          .from('shows')
          .select('title, date, time')
          .eq('id', id)
          .single()

        const { error } = await supabase
          .from('shows')
          .delete()
          .eq('id', id)

        if (error) throw error

        // Log the deletion
        if (showToDelete) {
          // Get current user email
          const { data: { user } } = await supabase.auth.getUser()
          const userEmail = user?.email || 'unknown'

          await logShowDeletion(
            id,
            showToDelete.title,
            userEmail,
            {
              date: showToDelete.date,
              time: showToDelete.time,
              deleted_at: new Date().toISOString()
            }
          )
        }

        fetchShows()
      } catch (error) {
        console.error('Error deleting show:', error)
      }
    }
  }





  const resetForm = () => {
    setFormData({
      title: '',
      date: '',
      time: '',
      price: '',
      description: '',
      layout_id: ''
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <div>
          <h1 className={`text-2xl sm:text-3xl font-semibold transition-colors duration-200 ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
            Shows
          </h1>
          <p className={`mt-1 text-sm transition-colors duration-200 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Manage show timings and schedules
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <button
            onClick={() => {
              resetForm()
              setEditingShow(null)
              setShowModal(true)
            }}
            className="bg-slate-900 text-white px-6 py-3 rounded-xl font-medium hover:bg-slate-800 transition-all duration-200 flex items-center justify-center touch-manipulation shadow-sm"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            <span>Add Show</span>
          </button>

        </div>
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

      <div className={`rounded-2xl shadow-sm border overflow-hidden transition-colors duration-200 ${darkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="overflow-x-auto -mx-3 sm:mx-0">
          <div className="px-3 sm:px-0">
            <table className={`min-w-full divide-y transition-colors duration-200 ${darkMode ? 'divide-slate-800' : 'divide-slate-200'}`}>
              <thead className={`transition-colors duration-200 ${darkMode ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                <tr>
                  <th className={`w-1/4 px-4 py-4 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-200 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    Show Details
                  </th>
                  <th className={`w-1/6 px-4 py-4 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-200 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    Date & Time
                  </th>
                  <th className={`w-1/12 px-4 py-4 text-center text-xs font-medium uppercase tracking-wider transition-colors duration-200 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    Price
                  </th>
                  <th className={`w-1/6 px-4 py-4 text-center text-xs font-medium uppercase tracking-wider transition-colors duration-200 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    Layout
                  </th>
                  <th className={`w-14 pl-1 pr-0 py-4 text-center text-xs font-medium uppercase tracking-wider transition-colors duration-200 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    Status
                  </th>
                  <th className={`w-12 pl-0 pr-1 py-4 text-center text-xs font-medium uppercase tracking-wider transition-colors duration-200 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className={`divide-y transition-colors duration-200 ${darkMode ? 'bg-slate-900/50 divide-slate-800' : 'bg-white divide-slate-200'}`}>
                {shows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <div className={`transition-colors duration-200 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        {selectedDate ? (
                          <>
                            <div className="text-lg mb-2">No shows found for {format(new Date(selectedDate), 'MMM dd, yyyy')}</div>
                            <div className="text-sm">Try selecting a different date or clear the filter to see all shows.</div>
                          </>
                        ) : (
                          <>
                            <div className="text-lg mb-2">No shows available</div>
                            <div className="text-sm">Create your first show to get started.</div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  shows.map((show) => (
                  <tr key={show.id} className={`transition-colors duration-200 ${darkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}`}>
                    <td className="px-4 py-4">
                      <div>
                        <div className={`text-sm font-medium transition-colors duration-200 ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{show.title}</div>
                        {show.description && (
                          <div className={`text-sm transition-colors duration-200 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{show.description}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className={`text-sm font-medium transition-colors duration-200 ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                        {format(new Date(show.date), 'MMM dd, yyyy')}
                      </div>
                      <div className={`text-sm transition-colors duration-200 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{format(new Date(`2000-01-01T${show.time}`), 'h:mm a')}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <div className={`text-sm font-medium transition-colors duration-200 ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>₹{show.price}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <div className={`text-sm transition-colors duration-200 ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{show.layout?.name || 'N/A'}</div>
                    </td>
                    <td className="pl-1 pr-0 py-4 whitespace-nowrap text-center">
                      <div className="flex justify-center">
                        <span className={`inline-flex items-center justify-center px-1 py-0.5 text-xs font-medium rounded-full min-w-[60px] ${show.status === 'ACTIVE'
                          ? darkMode
                            ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800/50'
                            : 'bg-emerald-100 text-emerald-800'
                          : show.status === 'HOUSE_FULL'
                            ? darkMode
                              ? 'bg-amber-900/30 text-amber-400 border border-amber-800/50'
                              : 'bg-amber-100 text-amber-800'
                            : show.status === 'SHOW_STARTED'
                              ? darkMode
                                ? 'bg-blue-900/30 text-blue-400 border border-blue-800/50'
                                : 'bg-blue-100 text-blue-800'
                              : darkMode
                                ? 'bg-slate-800 text-slate-300 border border-slate-700'
                                : 'bg-slate-100 text-slate-700'
                          }`}>
                          {show.status === 'ACTIVE' ? 'Active' :
                            show.status === 'HOUSE_FULL' ? 'House Full' :
                              show.status === 'SHOW_STARTED' ? 'Show Started' :
                                'Show Done'}
                        </span>
                      </div>
                    </td>
                    <td className="pl-0 pr-1 py-4 whitespace-nowrap text-sm font-medium text-center">
                      {show.status === 'SHOW_DONE' ? (
                        <span className={`text-sm font-medium transition-colors duration-200 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Done
                        </span>
                      ) : (
                        <div className="flex justify-center space-x-2">
                          <button
                            onClick={() => handleEdit(show)}
                            className={`p-2 rounded-lg transition-colors duration-200 ${darkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(show.id)}
                            className={`p-2 rounded-lg transition-colors duration-200 ${darkMode ? 'text-red-400 hover:text-red-300 hover:bg-red-900/20' : 'text-red-600 hover:text-red-700 hover:bg-red-50'}`}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`rounded-2xl p-6 sm:p-8 max-w-md w-full max-h-[90vh] overflow-y-auto transition-colors duration-200 shadow-xl ${darkMode ? 'bg-slate-900 border border-slate-800' : 'bg-white border border-slate-200'}`}>
            <h2 className={`text-2xl font-medium mb-6 transition-colors duration-200 ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
              {editingShow ? 'Edit Show' : 'Add New Show'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 transition-colors duration-200 ${darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                  Show Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors duration-200 ${darkMode
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900'
                    }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 transition-colors duration-200 ${darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                    Date
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors duration-200 ${darkMode
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                      }`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 transition-colors duration-200 ${darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                    Time
                  </label>
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    required
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors duration-200 ${darkMode
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                      }`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 transition-colors duration-200 ${darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                  Ticket Price (₹)
                </label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  required
                  min="0"
                  step="0.01"
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors duration-200 ${darkMode
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                    }`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 transition-colors duration-200 ${darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                  Layout
                </label>
                <select
                  value={formData.layout_id}
                  onChange={(e) => setFormData({ ...formData, layout_id: e.target.value })}
                  required
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors duration-200 ${darkMode
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                    }`}
                >
                  <option value="">Select a layout</option>
                  {layouts.map((layout) => (
                    <option key={layout.id} value={layout.id}>
                      {layout.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 transition-colors duration-200 ${darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                  Description (Optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors duration-200 ${darkMode
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900'
                    }`}
                />
              </div>



              <div className="flex space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className={`flex-1 py-3 px-4 rounded-xl font-medium transition-colors ${darkMode
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                    }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-primary-600 text-white py-3 px-4 rounded-xl font-medium hover:bg-primary-700 transition-colors"
                >
                  {editingShow ? 'Update' : 'Create'} Show
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Shows