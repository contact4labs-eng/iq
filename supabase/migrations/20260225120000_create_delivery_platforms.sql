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

-- RLS policy: users can manage platforms belonging to their company
CREATE POLICY "Users can manage own company platforms"
  ON delivery_platforms FOR ALL
  USING (company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid()));

-- Index for fast lookup by company
CREATE INDEX idx_delivery_platforms_company_id ON delivery_platforms(company_id);
