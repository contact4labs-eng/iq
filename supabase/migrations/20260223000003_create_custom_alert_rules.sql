-- Create custom_alert_rules table for user-configurable alert rule definitions
CREATE TABLE IF NOT EXISTS public.custom_alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  category TEXT NOT NULL,          -- 'sales' | 'customer' | 'smart'
  alert_type TEXT NOT NULL,        -- e.g. 'daily_sales_below', 'high_churn'
  enabled BOOLEAN NOT NULL DEFAULT true,
  severity TEXT NOT NULL DEFAULT 'medium',  -- 'low' | 'medium' | 'high' | 'critical'
  threshold_value NUMERIC(12,2),
  threshold_unit TEXT,             -- e.g. '%', '€', 'days', 'count'
  comparison_period TEXT,          -- 'daily' | 'weekly' | 'monthly'
  notes TEXT,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_custom_alert_rules_company_enabled
  ON public.custom_alert_rules (company_id, enabled);

CREATE OR REPLACE FUNCTION public.update_custom_alert_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_custom_alert_rules_updated_at ON public.custom_alert_rules;
CREATE TRIGGER trg_custom_alert_rules_updated_at
  BEFORE UPDATE ON public.custom_alert_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_custom_alert_rules_updated_at();

ALTER TABLE public.custom_alert_rules ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'custom_alert_rules' AND policyname = 'company_isolation_select') THEN
    CREATE POLICY company_isolation_select ON public.custom_alert_rules FOR SELECT
      USING (public.user_owns_company(company_id));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'custom_alert_rules' AND policyname = 'company_isolation_insert') THEN
    CREATE POLICY company_isolation_insert ON public.custom_alert_rules FOR INSERT
      WITH CHECK (public.user_owns_company(company_id));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'custom_alert_rules' AND policyname = 'company_isolation_update') THEN
    CREATE POLICY company_isolation_update ON public.custom_alert_rules FOR UPDATE
      USING (public.user_owns_company(company_id));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'custom_alert_rules' AND policyname = 'company_isolation_delete') THEN
    CREATE POLICY company_isolation_delete ON public.custom_alert_rules FOR DELETE
      USING (public.user_owns_company(company_id));
  END IF;
END $$;
