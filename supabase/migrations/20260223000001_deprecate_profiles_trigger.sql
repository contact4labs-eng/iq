-- The profiles table and its auto-creation trigger are unused.
-- The app uses the "companies" table instead (populated in Register.tsx).
-- The trigger was writing empty strings because signup never passes
-- company_name/afm in user metadata.
--
-- This migration drops the trigger to stop creating empty profile rows.
-- The profiles table is left in place for now (no data loss).
-- A future migration can DROP TABLE profiles if confirmed safe.

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

COMMENT ON TABLE public.profiles IS 'DEPRECATED: Not used by the application. See companies table instead.';
