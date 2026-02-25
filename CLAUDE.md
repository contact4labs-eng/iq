# 4Labs IQ — Project Reference

## Overview
4Labs IQ is a SaaS business intelligence platform for Greek small businesses (primarily food/hospitality). It manages invoices, tracks costs (COGS), provides financial analytics dashboards, and offers an AI-powered business Q&A assistant. Built with React + Vite + TypeScript on the frontend and Supabase (PostgreSQL + Auth + Edge Functions) on the backend.

**Primary language**: Greek (UI default), with English i18n support.
**Supabase project ID**: `dumyurixihhincxzyonu`

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18.3 + TypeScript 5.8 |
| Build | Vite 5.4 |
| Styling | TailwindCSS 3.4 + shadcn/ui (Radix primitives) |
| State / Data | TanStack React Query 5.x |
| Forms | React Hook Form + Zod validation |
| Routing | React Router DOM 6.x (lazy-loaded pages) |
| Charts | Recharts 2.x |
| Icons | Lucide React |
| Backend | Supabase (PostgreSQL, Auth, Storage, Edge Functions) |
| AI | Anthropic Claude Sonnet 4 via Supabase Edge Function (Deno) |
| Deployment | Lovable (auto-deploy on push) |

## Directory Structure

```
src/
├── components/           # React components
│   ├── ui/              # 40+ shadcn/ui primitives (do NOT hand-edit)
│   ├── ai/              # AI chat UI (BusinessQA, ConversationSidebar)
│   ├── analytics/       # Financial analytics & insight cards
│   ├── cogs/            # Cost of goods (ingredients, products, recipes)
│   ├── dashboard/       # Dashboard KPI widgets
│   ├── finance/         # Finance page components
│   ├── invoices/        # Invoice list, detail, upload, analytics
│   ├── layout/          # Sidebar, nav, topbar, responsive wrappers
│   └── alerts/          # Alert rules management
├── pages/               # Route page components (lazy-loaded)
├── hooks/               # Custom hooks
│   └── queries/         # React Query hooks for Supabase data
├── contexts/            # React contexts
│   ├── AuthContext.tsx   # Auth + company state (creates company on signup)
│   ├── ThemeContext.tsx  # Dark/light mode (next-themes)
│   └── LanguageContext.tsx # Greek/English i18n
├── integrations/supabase/
│   ├── client.ts        # Supabase client init
│   └── types.ts         # Auto-generated DB types (do NOT hand-edit)
├── lib/
│   ├── supabase.ts      # Supabase client singleton
│   └── utils.ts         # cn() utility
├── utils/               # seedDemoData, unitConversion
├── i18n/                # Translation files
└── main.tsx             # App entry point

supabase/
├── config.toml          # Project config
├── functions/
│   └── ai-chat/index.ts # Claude AI edge function (SSE streaming + tool use)
└── migrations/          # 8 SQL migrations defining full schema
```

## Routes

| Path | Page | Description |
|------|------|-------------|
| `/` | Index | Dashboard with KPIs |
| `/login` | Login | Auth (public) |
| `/register` | Register | Signup (public) |
| `/invoices` | Invoices | Invoice list + upload |
| `/invoices/:id` | InvoiceDetail | Single invoice view |
| `/finance` | Finance | Financial analytics dashboard |
| `/ai-insights` | AiInsights | AI chat interface |
| `/cogs` | COGS | Cost of goods management |
| `/fixed-costs` | FixedCosts | Monthly fixed expenses |
| `/alerts` | Alerts | Alert list |
| `/alert-rules` | CustomAlerts | Custom alert rule editor |
| `/automation` | AutomationPage | Workflow automation |
| `/notifications` | Notifications | Notification center |
| `/settings` | Settings | User/company settings |
| `/analytics` | — | Redirects to `/finance` |

All routes except `/login` and `/register` are protected (require auth).

## Database Schema (Supabase PostgreSQL)

### Multi-tenancy
All tables use `company_id` FK to `companies`. RLS enforces isolation via `public.user_owns_company(company_id)` helper function. Users can only access rows belonging to their company.

### Core Tables

**companies** — One per user (owner_user_id). Fields: name, afm (tax ID, unique), industry, currency, settings (JSONB), address, email, phone.

**profiles** — DEPRECATED (legacy). Auto-created on signup via trigger. Use `companies` instead.

**suppliers** — name, afm, email, phone, address. FK: company_id.

**invoices** — invoice_number, invoice_date, due_date, paid_date, status, subtotal, vat_amount, total_amount, notes. FKs: company_id, supplier_id, file_id.

**invoice_line_items** — description, quantity, unit_price, tax_rate, line_total. FKs: company_id, invoice_id. **Note**: Does NOT have columns: unit_of_measure, sku, discount_amount.

**files** — original_filename, storage_path, file_type, file_size_bytes, source_channel. FK: company_id.

### Finance Tables

**revenue_entries** — amount, entry_date, description. FK: company_id.

**expense_entries** — amount, entry_date, description. FK: company_id.

**fixed_costs** — category, amount, month (DATE, always 1st of month), notes. Unique: (company_id, category, month).

**cash_positions** — cash_on_hand, bank_balance, total_cash, recorded_date. FK: company_id.

**scheduled_payments** — amount, due_date, status. FKs: company_id, invoice_id, supplier_id.

### COGS Tables

**ingredients** — name, category, unit (kg/g/lt/ml), price_per_unit, supplier_name. FK: company_id.

**products** — name, category, type (recipe/resale), selling_price_dinein, selling_price_delivery, linked_ingredient_id. FK: company_id.

**product_ingredients** — quantity, unit, sort_order. FKs: product_id, ingredient_id (nullable), linked_product_id (nullable). Constraint: exactly one of ingredient_id or linked_product_id.

**margin_thresholds** — category, green_min, yellow_min. Unique: (company_id, category).

**price_lists** — name. FK: company_id. (Future expansion.)

### Alert Tables

**alerts** — title, description, alert_type, severity, status, recommended_action, resolved_at. FK: company_id.

**custom_alert_rules** — category (sales/customer/smart), alert_type, enabled, severity, threshold_value, threshold_unit (%/EUR/days/count), comparison_period, config (JSONB). FK: company_id.

### AI Tables

**ai_conversations** — title, is_archived, metadata (JSONB). FKs: company_id, user_id.

**ai_messages** — role (user/assistant), content, tool_calls (JSONB), attachments (JSONB). FK: conversation_id.

### DB Functions
- `user_owns_company(p_company_id UUID) → BOOLEAN` — used in all RLS policies.

## AI Chat Edge Function

**Path**: `supabase/functions/ai-chat/index.ts`
**Deploy**: `supabase functions deploy ai-chat`
**Required secret**: `ANTHROPIC_API_KEY`

- Uses Claude Sonnet 4 (`claude-sonnet-4-20250514`) with tool-calling
- Streams responses via SSE (Server-Sent Events)
- System prompt injects current date and user language (Greek/English)
- Max 8 tool-use rounds per request
- Persists conversations to `ai_conversations` + `ai_messages` tables

### Available AI Tools

| Tool | Description |
|------|-------------|
| `query_invoices` | Search invoices with filters (supplier, date range, status, amount) |
| `query_invoice_line_items` | Search line items by keyword, date range, company_id. Columns: description, quantity, unit_price, line_total, tax_rate |
| `query_suppliers` | List/search suppliers |
| `get_financial_summary` | Revenue, expenses, profit for a date range |
| `query_revenue_entries` | Revenue entries with date range filter |
| `query_expense_entries` | Expense entries with date range filter |
| `query_fixed_costs` | Monthly fixed costs with month filter |
| `get_cash_position` | Latest cash position |
| `query_ingredients` | COGS ingredients list |
| `query_products` | COGS products list |
| `get_product_cost` | Calculate product cost from recipe |

## Key Patterns

### Data Fetching
All Supabase queries go through custom React Query hooks in `src/hooks/queries/`. Pattern:
```ts
const { data, isLoading } = useQuery({
  queryKey: ['table-name', companyId, ...filters],
  queryFn: () => supabase.from('table').select('*').eq('company_id', companyId),
  enabled: !!companyId,
});
```

### Auth Flow
- `AuthContext` manages auth state via `supabase.auth.onAuthStateChange`
- On signup, a `companies` row is auto-created from user metadata (company_name, afm)
- If company is missing (legacy users), AuthContext auto-repairs by creating one
- `ProtectedRoute` wrapper redirects unauthenticated users to `/login`

### Component Library
- shadcn/ui components in `src/components/ui/` are generated — don't hand-edit
- Custom components compose shadcn primitives with business logic
- All styling uses Tailwind utility classes with CSS variables for theming

### Code Splitting
Vite manually chunks: `vendor-react`, `vendor-ui` (Radix), `vendor-charts` (Recharts), `vendor-supabase`.

## Scripts

```bash
npm run dev        # Dev server on port 8080
npm run build      # Production build
npm run lint       # ESLint
npm run test       # Vitest
npm run preview    # Preview prod build
```

## Environment Variables

**Frontend (.env)**:
- `VITE_SUPABASE_PROJECT_ID`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

**Edge Function Secrets** (set via `supabase secrets set`):
- `ANTHROPIC_API_KEY` — Claude API key
- `SUPABASE_URL` — auto-provided
- `SUPABASE_SERVICE_ROLE_KEY` — auto-provided

## Important Conventions

1. **Greek-first UI** — Default language is Greek. All user-facing strings should support both `el` and `en` via `LanguageContext`.
2. **Company isolation** — Every data table has `company_id`. Always filter by it. RLS enforces this at the DB level.
3. **No direct Supabase calls in components** — Use hooks from `src/hooks/queries/`.
4. **Auto-generated types** — `src/integrations/supabase/types.ts` is auto-generated from the Supabase schema. Regenerate with `supabase gen types typescript` after migration changes.
5. **Edge function deployment** — After changing `supabase/functions/ai-chat/index.ts`, deploy with `supabase functions deploy ai-chat`.
6. **Migrations** — Schema changes go in `supabase/migrations/` as timestamped SQL files. Apply with `supabase db push`.
