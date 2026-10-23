import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://tokvkychrsgcpakwhjiu.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_EdDq_I4m6IxkaQyUMLwXpQ_DJ4g1014'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
