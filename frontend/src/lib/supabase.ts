import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://kbtovhekblclkpqanyka.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtidG92aGVrYmxjbGtwcWFueWthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5MTY0ODQsImV4cCI6MjA5NjQ5MjQ4NH0.djEY7sD7-fBm7YVnfeaWuLaFPwdBDnir-4iJrW82Ilc'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
