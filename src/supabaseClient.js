import { createClient } from '@supabase/supabase-js'

// 👇 Inserisci i tuoi valori qui:
const supabaseUrl = 'https://zogjifdzsrhyeufqwepg.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvZ2ppZmR6c3JoeWV1ZnF3ZXBnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxMTI4OTQsImV4cCI6MjA3MjY4ODg5NH0.RbElxLJwKNYvqxAbCV17NLFGuNCj4MEpAn59liDuwUE'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
