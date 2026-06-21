import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'REDACTED_URL'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'REDACTED_JWT'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
