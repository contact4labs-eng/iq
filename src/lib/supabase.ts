import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_EXTERNAL_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_EXTERNAL_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing external Supabase configuration. Please set EXTERNAL_SUPABASE_URL and EXTERNAL_SUPABASE_ANON_KEY secrets.");
}

export const externalSupabase = createClient(supabaseUrl, supabaseAnonKey);
