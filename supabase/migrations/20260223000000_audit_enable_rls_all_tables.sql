-- RLS AUDIT: Ensure every application table has RLS enabled and basic policies.
-- Tables already with RLS: profiles, companies
-- Tables needing RLS: invoices, invoice_line_items, suppliers, files,
--   revenue_entries, expense_entries, cash_positions, scheduled_payments, alerts
--
-- All tables use company_id to scope data to the owning company.
-- Policy pattern: user can only access rows where company_id matches
-- a company they own (companies.owner_user_id = auth.uid()).
--
-- NOTE: Run this migration only after verifying your schema matches.
-- Some tables may already have RLS enabled via the Supabase dashboard.
-- The IF NOT EXISTS pattern for policies is not native to Postgres,
-- so we use DO blocks to check before creating.

-- Helper function: check if user owns the given company
CREATE OR REPLACE FUNCTION public.user_owns_company(p_company_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.companies
    WHERE id = p_company_id AND owner_user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- ============================================================
-- invoices
-- ============================================================
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'invoices' AND policyname = 'company_isolation_select') THEN
    CREATE POLICY company_isolation_select ON public.invoices FOR SELECT
      USING (public.user_owns_company(company_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'invoices' AND policyname = 'company_isolation_insert') THEN
    CREATE POLICY company_isolation_insert ON public.invoices FOR INSERT
      WITH CHECK (public.user_owns_company(company_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'invoices' AND policyname = 'company_isolation_update') THEN
    CREATE POLICY company_isolation_update ON public.invoices FOR UPDATE
      USING (public.user_owns_company(company_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'invoices' AND policyname = 'company_isolation_delete') THEN
    CREATE POLICY company_isolation_delete ON public.invoices FOR DELETE
      USING (public.user_owns_company(company_id));
  END IF;
END $$;

-- ============================================================
-- invoice_line_items
-- ============================================================
ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'invoice_line_items' AND policyname = 'company_isolation_select') THEN
    CREATE POLICY company_isolation_select ON public.invoice_line_items FOR SELECT
      USING (public.user_owns_company(company_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'invoice_line_items' AND policyname = 'company_isolation_insert') THEN
    CREATE POLICY company_isolation_insert ON public.invoice_line_items FOR INSERT
      WITH CHECK (public.user_owns_company(company_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'invoice_line_items' AND policyname = 'company_isolation_update') THEN
    CREATE POLICY company_isolation_update ON public.invoice_line_items FOR UPDATE
      USING (public.user_owns_company(company_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'invoice_line_items' AND policyname = 'company_isolation_delete') THEN
    CREATE POLICY company_isolation_delete ON public.invoice_line_items FOR DELETE
      USING (public.user_owns_company(company_id));
  END IF;
END $$;

-- ============================================================
-- suppliers
-- ============================================================
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'suppliers' AND policyname = 'company_isolation_select') THEN
    CREATE POLICY company_isolation_select ON public.suppliers FOR SELECT
      USING (public.user_owns_company(company_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'suppliers' AND policyname = 'company_isolation_insert') THEN
    CREATE POLICY company_isolation_insert ON public.suppliers FOR INSERT
      WITH CHECK (public.user_owns_company(company_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'suppliers' AND policyname = 'company_isolation_update') THEN
    CREATE POLICY company_isolation_update ON public.suppliers FOR UPDATE
      USING (public.user_owns_company(company_id));
  END IF;
END $$;

-- ============================================================
-- files
-- ============================================================
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'files' AND policyname = 'company_isolation_select') THEN
    CREATE POLICY company_isolation_select ON public.files FOR SELECT
      USING (public.user_owns_company(company_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'files' AND policyname = 'company_isolation_insert') THEN
    CREATE POLICY company_isolation_insert ON public.files FOR INSERT
      WITH CHECK (public.user_owns_company(company_id));
  END IF;
END $$;

-- ============================================================
-- revenue_entries
-- ============================================================
ALTER TABLE public.revenue_entries ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'revenue_entries' AND policyname = 'company_isolation_select') THEN
    CREATE POLICY company_isolation_select ON public.revenue_entries FOR SELECT
      USING (public.user_owns_company(company_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'revenue_entries' AND policyname = 'company_isolation_insert') THEN
    CREATE POLICY company_isolation_insert ON public.revenue_entries FOR INSERT
      WITH CHECK (public.user_owns_company(company_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'revenue_entries' AND policyname = 'company_isolation_update') THEN
    CREATE POLICY company_isolation_update ON public.revenue_entries FOR UPDATE
      USING (public.user_owns_company(company_id));
  END IF;
END $$;

-- ============================================================
-- expense_entries
-- ============================================================
ALTER TABLE public.expense_entries ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'expense_entries' AND policyname = 'company_isolation_select') THEN
    CREATE POLICY company_isolation_select ON public.expense_entries FOR SELECT
      USING (public.user_owns_company(company_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'expense_entries' AND policyname = 'company_isolation_insert') THEN
    CREATE POLICY company_isolation_insert ON public.expense_entries FOR INSERT
      WITH CHECK (public.user_owns_company(company_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'expense_entries' AND policyname = 'company_isolation_update') THEN
    CREATE POLICY company_isolation_update ON public.expense_entries FOR UPDATE
      USING (public.user_owns_company(company_id));
  END IF;
END $$;

-- ============================================================
-- cash_positions
-- ============================================================
ALTER TABLE public.cash_positions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cash_positions' AND policyname = 'company_isolation_select') THEN
    CREATE POLICY company_isolation_select ON public.cash_positions FOR SELECT
      USING (public.user_owns_company(company_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cash_positions' AND policyname = 'company_isolation_insert') THEN
    CREATE POLICY company_isolation_insert ON public.cash_positions FOR INSERT
      WITH CHECK (public.user_owns_company(company_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cash_positions' AND policyname = 'company_isolation_update') THEN
    CREATE POLICY company_isolation_update ON public.cash_positions FOR UPDATE
      USING (public.user_owns_company(company_id));
  END IF;
END $$;

-- ============================================================
-- scheduled_payments
-- ============================================================
ALTER TABLE public.scheduled_payments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'scheduled_payments' AND policyname = 'company_isolation_select') THEN
    CREATE POLICY company_isolation_select ON public.scheduled_payments FOR SELECT
      USING (public.user_owns_company(company_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'scheduled_payments' AND policyname = 'company_isolation_insert') THEN
    CREATE POLICY company_isolation_insert ON public.scheduled_payments FOR INSERT
      WITH CHECK (public.user_owns_company(company_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'scheduled_payments' AND policyname = 'company_isolation_update') THEN
    CREATE POLICY company_isolation_update ON public.scheduled_payments FOR UPDATE
      USING (public.user_owns_company(company_id));
  END IF;
END $$;

-- ============================================================
-- alerts
-- ============================================================
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'alerts' AND policyname = 'company_isolation_select') THEN
    CREATE POLICY company_isolation_select ON public.alerts FOR SELECT
      USING (public.user_owns_company(company_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'alerts' AND policyname = 'company_isolation_update') THEN
    CREATE POLICY company_isolation_update ON public.alerts FOR UPDATE
      USING (public.user_owns_company(company_id));
  END IF;
END $$;
