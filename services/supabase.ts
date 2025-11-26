
import { createClient } from '@supabase/supabase-js';

// ⚠️ REPLACE WITH YOUR ACTUAL SUPABASE PROJECT CREDENTIALS
// Get these from https://supabase.com/dashboard/project/_/settings/api
const SUPABASE_URL = 'https://syuucmzupefypfiolije.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_RPvmH7H4itOnTDLfASnO6A_spBxMYYF';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
