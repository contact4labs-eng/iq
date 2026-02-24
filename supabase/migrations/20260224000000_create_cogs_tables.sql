-- =============================================================
-- COGS (Cost of Goods) tables
-- =============================================================

-- 1. INGREDIENTS
CREATE TABLE IF NOT EXISTS public.ingredients (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT '',
  unit        TEXT NOT NULL DEFAULT 'kg',       -- kg | g | lt | ml
  price_per_unit NUMERIC(12,4) NOT NULL DEFAULT 0,
  supplier_name  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ingredients_company ON public.ingredients(company_id);
CREATE INDEX IF NOT EXISTS idx_ingredients_category ON public.ingredients(company_id, category);

ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY ingredients_select ON public.ingredients FOR SELECT
  USING (public.user_owns_company(company_id));
CREATE POLICY ingredients_insert ON public.ingredients FOR INSERT
  WITH CHECK (public.user_owns_company(company_id));
CREATE POLICY ingredients_update ON public.ingredients FOR UPDATE
  USING (public.user_owns_company(company_id));
CREATE POLICY ingredients_delete ON public.ingredients FOR DELETE
  USING (public.user_owns_company(company_id));

CREATE OR REPLACE FUNCTION public.update_ingredients_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ingredients_updated_at ON public.ingredients;
CREATE TRIGGER ingredients_updated_at
  BEFORE UPDATE ON public.ingredients
  FOR EACH ROW EXECUTE FUNCTION public.update_ingredients_updated_at();

-- 2. PRODUCTS
CREATE TABLE IF NOT EXISTS public.products (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,
  category              TEXT NOT NULL DEFAULT '',
  type                  TEXT NOT NULL DEFAULT 'recipe',  -- recipe | resale
  selling_price_dinein  NUMERIC(12,2) DEFAULT 0,
  selling_price_delivery NUMERIC(12,2) DEFAULT 0,
  linked_ingredient_id  UUID REFERENCES public.ingredients(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_company ON public.products(company_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(company_id, category);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY products_select ON public.products FOR SELECT
  USING (public.user_owns_company(company_id));
CREATE POLICY products_insert ON public.products FOR INSERT
  WITH CHECK (public.user_owns_company(company_id));
CREATE POLICY products_update ON public.products FOR UPDATE
  USING (public.user_owns_company(company_id));
CREATE POLICY products_delete ON public.products FOR DELETE
  USING (public.user_owns_company(company_id));

CREATE OR REPLACE FUNCTION public.update_products_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS products_updated_at ON public.products;
CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_products_updated_at();

-- 3. PRODUCT_INGREDIENTS (recipe join table)
CREATE TABLE IF NOT EXISTS public.product_ingredients (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id         UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  ingredient_id      UUID REFERENCES public.ingredients(id) ON DELETE CASCADE,
  linked_product_id  UUID REFERENCES public.products(id) ON DELETE CASCADE,
  quantity           NUMERIC(12,4) NOT NULL DEFAULT 0,
  unit               TEXT NOT NULL DEFAULT 'g',
  sort_order         INT NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_ingredient_or_product CHECK (
    (ingredient_id IS NOT NULL AND linked_product_id IS NULL)
    OR (ingredient_id IS NULL AND linked_product_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_product_ingredients_product ON public.product_ingredients(product_id);

-- RLS via product's company_id
ALTER TABLE public.product_ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY product_ingredients_select ON public.product_ingredients FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_ingredients.product_id
    AND public.user_owns_company(p.company_id)
  ));
CREATE POLICY product_ingredients_insert ON public.product_ingredients FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_ingredients.product_id
    AND public.user_owns_company(p.company_id)
  ));
CREATE POLICY product_ingredients_update ON public.product_ingredients FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_ingredients.product_id
    AND public.user_owns_company(p.company_id)
  ));
CREATE POLICY product_ingredients_delete ON public.product_ingredients FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_ingredients.product_id
    AND public.user_owns_company(p.company_id)
  ));

CREATE OR REPLACE FUNCTION public.update_product_ingredients_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS product_ingredients_updated_at ON public.product_ingredients;
CREATE TRIGGER product_ingredients_updated_at
  BEFORE UPDATE ON public.product_ingredients
  FOR EACH ROW EXECUTE FUNCTION public.update_product_ingredients_updated_at();

-- 4. MARGIN_THRESHOLDS
CREATE TABLE IF NOT EXISTS public.margin_thresholds (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  category    TEXT NOT NULL,
  green_min   NUMERIC(5,2) NOT NULL DEFAULT 65,
  yellow_min  NUMERIC(5,2) NOT NULL DEFAULT 45,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_margin_thresholds UNIQUE (company_id, category)
);

ALTER TABLE public.margin_thresholds ENABLE ROW LEVEL SECURITY;

CREATE POLICY margin_thresholds_select ON public.margin_thresholds FOR SELECT
  USING (public.user_owns_company(company_id));
CREATE POLICY margin_thresholds_insert ON public.margin_thresholds FOR INSERT
  WITH CHECK (public.user_owns_company(company_id));
CREATE POLICY margin_thresholds_update ON public.margin_thresholds FOR UPDATE
  USING (public.user_owns_company(company_id));
CREATE POLICY margin_thresholds_delete ON public.margin_thresholds FOR DELETE
  USING (public.user_owns_company(company_id));

CREATE OR REPLACE FUNCTION public.update_margin_thresholds_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS margin_thresholds_updated_at ON public.margin_thresholds;
CREATE TRIGGER margin_thresholds_updated_at
  BEFORE UPDATE ON public.margin_thresholds
  FOR EACH ROW EXECUTE FUNCTION public.update_margin_thresholds_updated_at();

-- 5. PRICE_LISTS (future expansion)
CREATE TABLE IF NOT EXISTS public.price_lists (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.price_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY price_lists_select ON public.price_lists FOR SELECT
  USING (public.user_owns_company(company_id));
CREATE POLICY price_lists_insert ON public.price_lists FOR INSERT
  WITH CHECK (public.user_owns_company(company_id));
CREATE POLICY price_lists_update ON public.price_lists FOR UPDATE
  USING (public.user_owns_company(company_id));
CREATE POLICY price_lists_delete ON public.price_lists FOR DELETE
  USING (public.user_owns_company(company_id));

CREATE OR REPLACE FUNCTION public.update_price_lists_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS price_lists_updated_at ON public.price_lists;
CREATE TRIGGER price_lists_updated_at
  BEFORE UPDATE ON public.price_lists
  FOR EACH ROW EXECUTE FUNCTION public.update_price_lists_updated_at();
