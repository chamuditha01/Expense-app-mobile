import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bzouvfisojgybtgrkoff.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6b3V2Zmlzb2pneWJ0Z3Jrb2ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1MzgwNDksImV4cCI6MjA5ODExNDA0OX0.11_19pZruDjx2iPPW-a_5JSP1en_wP1mDGPb-dPbyBQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});