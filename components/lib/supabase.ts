import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://offzcclrauffsyjrvxia.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mZnpjY2xyYXVmZnN5anJ2eGlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4NjU0NDcsImV4cCI6MjA4MzQ0MTQ0N30.WvSN_pyeTE-Wv2jbdJAMfO5DF_a97WBKbUXolF40TKQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});