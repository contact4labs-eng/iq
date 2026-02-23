-- Create fixed_costs table for monthly recurring expenses
CREATE TABLE IF NOT EXISTS public.fixed_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  month DATE NOT NULL,              -- stored as first day of month (YYYY-MM-01)
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Prevent duplicate entries: one entry per category per month per company
  CONSTRAINT fixed_costs_unique_month_category UNIQUE (company_id, category, month)
);

-- Index for fast company + month lookups
CREATE INDEX IF NOT EXISTS idx_fixed_costs_company_month
  ON public.fixed_costs (company_id, month DESC);

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION public.update_fixed_costs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_fixed_costs_updated_at ON public.fixed_costs;
CREATE TRIGGER trg_fixed_costs_updated_at
  BEFORE UPDATE ON public.fixed_costs
  FOR EACH ROW EXECUTE FUNCTION public.update_fixed_costs_updated_at();

-- Enable RLS
ALTER TABLE public.fixed_costs ENABLE ROW LEVEL SECURITY;

-- RLS policies using existing user_owns_company helper
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'fixed_costs' AND policyname = 'company_isolation_select') THEN
    CREATE POLICY company_isolation_select ON public.fixed_costs FOR SELECT
      USING (public.user_owns_company(company_id));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'fixed_costs' AND policyname = 'company_isolation_insert') THEN
    CREATE POLICY company_isolation_insert ON public.fixed_costs FOR INSERT
      WITH CHECK (public.user_owns_company(company_id));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'fixed_costs' AND policyname = 'company_isolation_update') THEN
    CREATE POLICY company_isolation_update ON public.fixed_costs FOR UPDATE
      USING (public.user_owns_company(company_id));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'fixed_costs' AND policyname = 'company_isolation_delete') THEN
    CREATE POLICY company_isolation_delete ON public.fixed_costs FOR DELETE
      USING (public.user_owns_company(company_id));
  END IF;
END $$;
