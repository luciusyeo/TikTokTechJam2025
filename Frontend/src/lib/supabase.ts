import { createClient } from '@supabase/supabase-js'
import Constants from 'expo-constants'

const supabaseUrl = process.env.SUPABASE_URL || Constants.expoConfig?.extra?.supabaseUrl
const supabaseKey = process.env.SUPABASE_KEY || Constants.expoConfig?.extra?.supabaseKey

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseKey)