import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
  'https://yfzhifdxneetglhdxipx.supabase.co';

const supabaseAnonKey =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  'sb_publishable_s4YJ8mFdjmzZDhpC7P_itQ_bXxQ7n54';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
