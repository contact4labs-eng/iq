import { supabase as _supabase } from "@/integrations/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";

// Re-export cast to generic SupabaseClient so code can access
// tables/functions that aren't in the auto-generated local types.
export const supabase = _supabase as unknown as SupabaseClient;
