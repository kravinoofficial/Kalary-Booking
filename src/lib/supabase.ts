import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'YOUR_SUPABASE_URL'
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface Layout {
  id: string
  name: string
  structure: any
  created_at: string
}

export interface Show {
  id: string
  title: string
  date: string
  time: string
  price: number
  description?: string
  layout_id: string
  active: boolean
  status?: 'ACTIVE' | 'HOUSE_FULL' | 'SHOW_STARTED' | 'SHOW_DONE'
  created_at: string
  layout?: Layout
}

export interface Seat {
  id: string
  layout_id: string
  section: string
  row: string
  seat_number: string
  position: { x: number; y: number }
  price: number
}

export interface Booking {
  id: string
  show_id: string
  seat_id: string
  seat_code: string
  booked_by: string
  booking_time: string
  status: 'CONFIRMED' | 'CANCELLED'
}

export interface Ticket {
  id: string
  booking_id: string
  show_id: string
  seat_id: string
  seat_code: string
  ticket_code: string
  price: number
  generated_by: string
  generated_at: string
  status: 'ACTIVE' | 'REVOKED'
}