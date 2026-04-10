import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vpvgibldtrwuxeaudjbh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwdmdpYmxkdHJ3dXhlYXVkamJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MDg0MjcsImV4cCI6MjA5MDk4NDQyN30.LAyGqGBDsnb-5dg9A0vGwgGaxmr9moFICr2NI2Id6tg';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
