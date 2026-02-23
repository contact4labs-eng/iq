-- Enable RLS on companies table
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Users can only view their own company
CREATE POLICY "Users can view own company"
  ON public.companies
  FOR SELECT
  USING (auth.uid() = owner_user_id);

-- Users can insert a company they own
CREATE POLICY "Users can insert own company"
  ON public.companies
  FOR INSERT
  WITH CHECK (auth.uid() = owner_user_id);

-- Users can update their own company
CREATE POLICY "Users can update own company"
  ON public.companies
  FOR UPDATE
  USING (auth.uid() = owner_user_id);

-- Prevent company deletion via API (admin-only)
-- No DELETE policy = no one can delete via the API
