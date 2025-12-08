/**
 * Supabase Configuration
 * Supabase client setup for React Native
 */

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Supabase credentials
const SUPABASE_URL = 'https://khgwhkhwverzbnnmcpct.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtoZ3doa2h3dmVyemJubm1jcGN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyMjk0NTYsImV4cCI6MjA3OTgwNTQ1Nn0.JAL_WeVLvZHodO1PxMuEwpc5p35CbTyaA0kPIXDnYIY';

// Create Supabase client
let supabase;

try {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
  console.log('Supabase client initialized successfully');
} catch (error) {
  console.error('Error initializing Supabase client:', error);
  // Fallback: create client without AsyncStorage
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

export default supabase;
export { supabase };

