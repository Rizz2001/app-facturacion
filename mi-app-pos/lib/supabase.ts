import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Solo aplicar el polyfill en entornos nativos donde URLSearchParams aveces falla
if (Platform.OS !== 'web') {
  require('react-native-url-polyfill/auto');
}

const SUPABASE_URL = 'https://djsdgaaojklntmvggvrz.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqc2RnYWFvamtsbnRtdmdndnJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5MzkxNDUsImV4cCI6MjA5MTUxNTE0NX0.mpxU1AdAp-EBV4XjGlU_APeKoLL_s-G50GcCOsVsAb8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});
