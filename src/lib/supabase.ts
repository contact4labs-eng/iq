// Re-export the auto-generated client, cast to SupabaseClient
// so it works with tables/functions not in the auto-generated types.
import { supabase as _supabase } from "@/integrations/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";

export const supabase = _supabase as unknown as SupabaseClient;
