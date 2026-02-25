-- Create delivery_platforms table for tracking platform commissions
CREATE TABLE IF NOT EXISTS delivery_platforms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  commission_percent NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE delivery_platforms ENABLE ROW LEVEL SECURITY;

-- RLS policies using the existing user_owns_company function
CREATE POLICY "delivery_platforms_select" ON delivery_platforms FOR SELECT USING (user_owns_company(company_id));
CREATE POLICY "delivery_platforms_insert" ON delivery_platforms FOR INSERT WITH CHECK (user_owns_company(company_id));
CREATE POLICY "delivery_platforms_update" ON delivery_platforms FOR UPDATE USING (user_owns_company(company_id));
CREATE POLICY "delivery_platforms_delete" ON delivery_platforms FOR DELETE USING (user_owns_company(company_id));

-- Index for fast lookup by company
CREATE INDEX idx_delivery_platforms_company_id ON delivery_platforms(company_id);
