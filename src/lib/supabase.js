import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://mbydrgcozoqwjloxuybh.supabase.co';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ieWRyZ2Nvem9xd2psb3h1eWJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE2OTgwNTAsImV4cCI6MjEwNzI3NDA1MH0.GNL-oOW7EQ2hTYyt428pkAaDCC8kt5Z0Isa68q1xkZ8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
