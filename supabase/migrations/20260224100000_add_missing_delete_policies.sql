-- Add missing DELETE policies to tables that have SELECT/INSERT/UPDATE but no DELETE.
-- Without explicit DELETE policies, RLS defaults to denying deletes for these tables.
-- This uses the same user_owns_company(company_id) pattern established in
-- 20260223000000_audit_enable_rls_all_tables.sql.

-- suppliers
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'suppliers' AND policyname = 'company_isolation_delete') THEN
    CREATE POLICY company_isolation_delete ON public.suppliers FOR DELETE
      USING (public.user_owns_company(company_id));
  END IF;
END $$;

-- files
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'files' AND policyname = 'company_isolation_delete') THEN
    CREATE POLICY company_isolation_delete ON public.files FOR DELETE
      USING (public.user_owns_company(company_id));
  END IF;
END $$;

-- revenue_entries
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'revenue_entries' AND policyname = 'company_isolation_delete') THEN
    CREATE POLICY company_isolation_delete ON public.revenue_entries FOR DELETE
      USING (public.user_owns_company(company_id));
  END IF;
END $$;

-- expense_entries
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'expense_entries' AND policyname = 'company_isolation_delete') THEN
    CREATE POLICY company_isolation_delete ON public.expense_entries FOR DELETE
      USING (public.user_owns_company(company_id));
  END IF;
END $$;

-- cash_positions
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cash_positions' AND policyname = 'company_isolation_delete') THEN
    CREATE POLICY company_isolation_delete ON public.cash_positions FOR DELETE
      USING (public.user_owns_company(company_id));
  END IF;
END $$;

-- scheduled_payments
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'scheduled_payments' AND policyname = 'company_isolation_delete') THEN
    CREATE POLICY company_isolation_delete ON public.scheduled_payments FOR DELETE
      USING (public.user_owns_company(company_id));
  END IF;
END $$;

-- alerts
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'alerts' AND policyname = 'company_isolation_delete') THEN
    CREATE POLICY company_isolation_delete ON public.alerts FOR DELETE
      USING (public.user_owns_company(company_id));
  END IF;
END $$;
