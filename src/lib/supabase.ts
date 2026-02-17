import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL = "https://dumyurixihhincxzyonu.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1bXl1cml4aWhoaW5jeHp5b251Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2Mzk2NTMsImV4cCI6MjA4NjIxNTY1M30.6OopGPiSQvEhBDIbNUXV6NeVmfxN7z-u4IMYMa02uaU";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
