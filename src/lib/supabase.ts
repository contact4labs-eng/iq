import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://dumyurixihhincxzyonu.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_z4aTLrUmIj69DNG-H2r50g_qp9bAFlD";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
