import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Watchlist = {
  id: string
  user_id: string
  ticker: string
  created_at: string
}

export type Portfolio = {
  id: string
  user_id: string
  ticker: string
  quantity: number
  avg_price: number
  created_at: string
}

export type PriceAlert = {
  id: string
  user_id: string
  ticker: string
  target_price: number
  condition: 'above' | 'below'
  active: boolean
  created_at: string
}
