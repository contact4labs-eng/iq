// supabase/functions/ai-chat/index.ts
// Deploy: supabase functions deploy ai-chat
// Required secret: ANTHROPIC_API_KEY (set via supabase secrets set ANTHROPIC_API_KEY=sk-ant-...)

import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MODEL = "claude-sonnet-4-20250514";
const MAX_TOKENS = 8192;
const MAX_TOOL_ROUNDS = 8; // Safety limit on tool-use loops

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface ToolResult {
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}

/* ------------------------------------------------------------------ */
/*  System prompt                                                       */
/* ------------------------------------------------------------------ */

function buildSystemPrompt(language: string, today: string): string {
  const lang = language === "el" ? "Greek" : "English";

  return `You are the AI financial analyst and business assistant for 4Labs, a business management platform for food & beverage companies. You help business owners understand their finances, suppliers, costs, products, and make better decisions.

## Current Date
Today's date is ${today}. Always use this as your reference point when interpreting relative dates like "last month", "this week", "yesterday", etc.

## Your Personality
- Professional yet friendly and approachable — like a trusted financial advisor
- You speak in ${lang} by default (match the user's language)
- Thorough and insightful — don't just recite numbers, explain what they mean
- Proactive — when you spot problems (overdue invoices, declining margins, supplier risk), flag them even if not asked
- Actionable — always end with practical recommendations or next steps

## How You Work
You have access to tools that let you query the business database in real time. When a user asks a question:
1. Think about which data you need
2. Use the appropriate tools to fetch that data
3. Analyze the results and provide insightful commentary
4. You can chain multiple tool calls to build a comprehensive answer

## Your Capabilities
- **Financial analysis**: revenue, expenses, profit margins, cash flow, trends, period comparisons
- **Supplier analysis**: spending patterns, dependency risk, price changes, vendor performance
- **Invoice management**: search, filter, track overdue, analyze payment cycles, update statuses, view individual invoice line items (products, quantities, unit prices)
- **Product & cost analysis**: product margins, ingredient costs, recipe costing, price optimization
- **Fixed costs & overhead**: monthly recurring costs, payroll, rent analysis
- **Alerts & monitoring**: view active alerts, create custom alert rules
- **Cash management**: cash position, bank balance, liquidity analysis
- **Actions**: You can update invoice statuses, create alert rules, and add fixed costs — BUT always describe what you will do and ask the user for confirmation before executing any write operation.

## Response Guidelines
- Adapt response length to the complexity of the question — brief for simple queries, detailed for analysis
- Use € for currency, format numbers with 2 decimal places using European formatting (e.g., 1.234,56 €)
- When comparing periods, always show the percentage change and explain its significance
- Highlight concerning trends with ⚠️ warnings
- Use markdown formatting: **bold** for key numbers, bullet lists for multiple items, tables for comparisons
- When presenting financial data, use markdown tables for clarity
- Suggest follow-up analyses the user might find useful
- If you don't have enough data, say so honestly and suggest what data would help

## Write Operation Safety
When asked to perform an action (update invoice, create alert, add cost), ALWAYS:
1. Clearly state what action you will take
2. Show the specific details (which invoice, what status, what amount)
3. Ask "Shall I proceed?" or similar confirmation
4. Only execute after the user confirms

## General Knowledge
You also have broad business and financial knowledge. Feel free to answer general questions about accounting, business strategy, tax considerations, etc. Make it clear when you're giving general advice vs. analyzing their specific data.`;
}

/* ------------------------------------------------------------------ */
/*  Anthropic API call (non-streaming, for tool use loop)               */
/* ------------------------------------------------------------------ */

interface AnthropicMessage {
  role: "user" | "assistant";
  content: string | Array<Record<string, unknown>>;
}

async function callAnthropic(
  systemPrompt: string,
  messages: AnthropicMessage[],
  includeTools: boolean = true,
): Promise<{
  stop_reason: string;
  content: Array<Record<string, unknown>>;
}> {
  const body: Record<string, unknown> = {
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages,
  };

  if (includeTools) {
    body.tools = TOOL_DEFINITIONS;
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("Anthropic API error:", response.status, errText);
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  const result = await response.json();
  return {
    stop_reason: result.stop_reason,
    content: result.content,
  };
}

/* ------------------------------------------------------------------ */
/*  Anthropic streaming call (for final text response)                  */
/* ------------------------------------------------------------------ */

async function callAnthropicStreaming(
  systemPrompt: string,
  messages: AnthropicMessage[],
): Promise<ReadableStream> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("Anthropic streaming error:", response.status, errText);
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  return response.body!;
}

/* ------------------------------------------------------------------ */
/*  SSE encoding helper                                                 */
/* ------------------------------------------------------------------ */

function encodeSSE(eventType: string, data: unknown): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(`event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`);
}

/* ------------------------------------------------------------------ */
/*  Tool definitions for Anthropic API                                  */
/* ------------------------------------------------------------------ */

const TOOL_DEFINITIONS: ToolDefinition[] = [
  // ===== READ OPERATIONS =====
  {
    name: "query_invoices",
    description: "Search and filter invoices. Can filter by status, date range, supplier name, amount range. Returns invoice details including line items count. Use this when the user asks about specific invoices, invoice history, or wants to find particular invoices.",
    input_schema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["uploaded", "processing", "extracted", "approved", "flagged", "rejected", "paid"],
          description: "Filter by invoice status",
        },
        from_date: { type: "string", description: "Start date (YYYY-MM-DD)" },
        to_date: { type: "string", description: "End date (YYYY-MM-DD)" },
        supplier_name: { type: "string", description: "Filter by supplier name (partial match)" },
        min_amount: { type: "number", description: "Minimum total amount" },
        max_amount: { type: "number", description: "Maximum total amount" },
        limit: { type: "number", description: "Max results to return (default 25, max 100)" },
        order_by: {
          type: "string",
          enum: ["invoice_date", "total_amount", "due_date"],
          description: "Field to sort by (default: invoice_date)",
        },
        ascending: { type: "boolean", description: "Sort ascending (default: false)" },
      },
      required: [],
    },
  },
  {
    name: "query_revenue",
    description: "Get revenue data for any date range, with optional grouping by day/week/month. Use when the user asks about revenue, income, sales figures, or revenue trends.",
    input_schema: {
      type: "object",
      properties: {
        from_date: { type: "string", description: "Start date (YYYY-MM-DD). Defaults to start of current month." },
        to_date: { type: "string", description: "End date (YYYY-MM-DD). Defaults to today." },
        group_by: {
          type: "string",
          enum: ["day", "week", "month"],
          description: "Group results by time period. If omitted, returns individual entries.",
        },
      },
      required: [],
    },
  },
  {
    name: "query_expenses",
    description: "Get expense data for any date range, with optional category breakdown or grouping. Use when the user asks about expenses, costs, spending, or wants a breakdown.",
    input_schema: {
      type: "object",
      properties: {
        from_date: { type: "string", description: "Start date (YYYY-MM-DD). Defaults to start of current month." },
        to_date: { type: "string", description: "End date (YYYY-MM-DD). Defaults to today." },
        category: { type: "string", description: "Filter by expense category" },
        group_by: {
          type: "string",
          enum: ["day", "week", "month", "category"],
          description: "Group results. 'category' gives a breakdown by category.",
        },
      },
      required: [],
    },
  },
  {
    name: "query_suppliers",
    description: "Get supplier information including spending totals, invoice counts, and last invoice date. Use when the user asks about suppliers, vendor performance, or spending by supplier.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Filter by supplier name (partial match)" },
        from_date: { type: "string", description: "Calculate spending from this date (YYYY-MM-DD)" },
        to_date: { type: "string", description: "Calculate spending until this date (YYYY-MM-DD)" },
        sort_by: {
          type: "string",
          enum: ["total_spent", "invoice_count", "name"],
          description: "Sort suppliers by (default: total_spent)",
        },
        limit: { type: "number", description: "Max results (default 20)" },
      },
      required: [],
    },
  },
  {
    name: "query_products",
    description: "Get product information including pricing, category, type, and ingredient composition. Use when the user asks about products, menu items, pricing, or product costs.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Filter by product name (partial match)" },
        category: { type: "string", description: "Filter by product category" },
        type: { type: "string", enum: ["recipe", "resale"], description: "Filter by product type" },
        include_ingredients: { type: "boolean", description: "Include ingredient breakdown (default false)" },
        limit: { type: "number", description: "Max results (default 50)" },
      },
      required: [],
    },
  },
  {
    name: "query_ingredients",
    description: "Get ingredient information with pricing, units, and supplier details. Use when the user asks about ingredients, raw materials, or ingredient costs.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Filter by ingredient name (partial match)" },
        category: { type: "string", description: "Filter by category" },
        supplier_name: { type: "string", description: "Filter by supplier" },
        sort_by: {
          type: "string",
          enum: ["name", "price_per_unit", "category"],
          description: "Sort by field",
        },
        limit: { type: "number", description: "Max results (default 50)" },
      },
      required: [],
    },
  },
  {
    name: "get_financial_summary",
    description: "Get a comprehensive financial summary for a date range including revenue, expenses, profit, margins, and comparisons with the previous period. Use for broad financial questions or 'how is the business doing' type queries.",
    input_schema: {
      type: "object",
      properties: {
        from_date: { type: "string", description: "Start date (YYYY-MM-DD). Defaults to start of current month." },
        to_date: { type: "string", description: "End date (YYYY-MM-DD). Defaults to today." },
      },
      required: [],
    },
  },
  {
    name: "get_cash_position",
    description: "Get the current or historical cash position (cash on hand, bank balance, total cash). Use when the user asks about available cash, bank balance, or liquidity.",
    input_schema: {
      type: "object",
      properties: {
        date: { type: "string", description: "Get cash position for this date (YYYY-MM-DD). Defaults to latest." },
        history_days: { type: "number", description: "If set, returns cash positions for the last N days." },
      },
      required: [],
    },
  },
  {
    name: "query_fixed_costs",
    description: "Get monthly fixed/recurring costs by category. Use when the user asks about fixed costs, overhead, rent, payroll, or recurring expenses.",
    input_schema: {
      type: "object",
      properties: {
        month: { type: "string", description: "Month in YYYY-MM-DD format (first of month). Defaults to current month." },
        category: { type: "string", description: "Filter by category" },
      },
      required: [],
    },
  },
  {
    name: "get_overdue_invoices",
    description: "Get all overdue invoices with days overdue and supplier info. Use when the user asks about overdue payments, late invoices, or payment issues.",
    input_schema: {
      type: "object",
      properties: {
        min_days_overdue: { type: "number", description: "Only show invoices overdue by at least this many days" },
        limit: { type: "number", description: "Max results (default 20)" },
      },
      required: [],
    },
  },
  {
    name: "get_scheduled_payments",
    description: "Get upcoming scheduled/pending payments. Use when the user asks about upcoming payments, future obligations, or payment schedule.",
    input_schema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["pending", "completed", "cancelled"], description: "Filter by status (default: pending)" },
        from_date: { type: "string", description: "Show payments due from this date" },
        to_date: { type: "string", description: "Show payments due until this date" },
        limit: { type: "number", description: "Max results (default 20)" },
      },
      required: [],
    },
  },
  {
    name: "get_alerts",
    description: "Get active alerts and notifications. Use when the user asks about warnings, issues, or things that need attention.",
    input_schema: {
      type: "object",
      properties: {
        severity: { type: "string", enum: ["critical", "warning", "info"], description: "Filter by severity" },
        status: { type: "string", enum: ["active", "dismissed", "resolved"], description: "Filter by status (default: active)" },
        limit: { type: "number", description: "Max results (default 20)" },
      },
      required: [],
    },
  },
  {
    name: "query_invoice_line_items",
    description: "Get the detailed line items (products/items) of one or more invoices. Each line item includes the product description, quantity, unit price, and line total. Use this when the user asks about specific products in invoices, wants to find the price of a product from an invoice, or needs to see what was purchased in a particular invoice or time period. You can search by invoice_id, by product description, by supplier name, and/or by date range (filtering on the parent invoice's date). This is the best tool for questions like 'how much did I spend on X last month'.",
    input_schema: {
      type: "object",
      properties: {
        invoice_id: { type: "string", description: "UUID of a specific invoice to get line items for" },
        description_search: { type: "string", description: "Search line items by product description (partial match, case insensitive). E.g. 'αγκιναρα', 'μοσχαρι', 'pollock', 'κρεας'" },
        supplier_name: { type: "string", description: "Filter line items by supplier name (joins through invoices→suppliers)" },
        from_date: { type: "string", description: "Filter by invoice date >= this date (YYYY-MM-DD)" },
        to_date: { type: "string", description: "Filter by invoice date <= this date (YYYY-MM-DD)" },
        min_unit_price: { type: "number", description: "Filter items with unit price >= this value" },
        max_unit_price: { type: "number", description: "Filter items with unit price <= this value" },
        limit: { type: "number", description: "Max results to return (default 50, max 200)" },
        order_by: {
          type: "string",
          enum: ["description", "unit_price", "line_total", "quantity"],
          description: "Field to sort by (default: description)",
        },
        ascending: { type: "boolean", description: "Sort ascending (default: true)" },
      },
      required: [],
    },
  },
  // ===== WRITE OPERATIONS =====
  {
    name: "update_invoice_status",
    description: "Update the status of an invoice (approve, reject, flag, mark as paid). IMPORTANT: Always confirm with the user before executing this action. Describe what you will do and ask for confirmation first.",
    input_schema: {
      type: "object",
      properties: {
        invoice_id: { type: "string", description: "UUID of the invoice to update" },
        new_status: {
          type: "string",
          enum: ["approved", "rejected", "flagged", "paid"],
          description: "New status for the invoice",
        },
        notes: { type: "string", description: "Optional notes about the status change" },
      },
      required: ["invoice_id", "new_status"],
    },
  },
  {
    name: "create_alert_rule",
    description: "Create a custom alert rule to notify the user when certain conditions are met. IMPORTANT: Always confirm with the user before creating. Describe the rule and ask for confirmation.",
    input_schema: {
      type: "object",
      properties: {
        alert_type: { type: "string", description: "Type of alert to monitor" },
        category: { type: "string", enum: ["sales", "customer", "smart"], description: "Alert category" },
        threshold_value: { type: "number", description: "Threshold value that triggers the alert" },
        threshold_unit: { type: "string", description: "Unit for threshold (e.g., 'EUR', 'days')" },
        comparison_period: { type: "string", description: "Period to compare (e.g., 'daily', 'weekly')" },
        severity: { type: "string", enum: ["critical", "warning", "info"], description: "Severity level" },
        notes: { type: "string", description: "Optional notes about the rule" },
      },
      required: ["alert_type", "category", "severity"],
    },
  },
  {
    name: "create_fixed_cost",
    description: "Add a new monthly fixed cost entry. IMPORTANT: Always confirm with the user before creating. Describe what you will add and ask for confirmation.",
    input_schema: {
      type: "object",
      properties: {
        category: { type: "string", description: "Cost category (e.g., 'Ενοίκιο', 'Μισθοδοσία', 'Utilities')" },
        amount: { type: "number", description: "Monthly cost amount in euros" },
        notes: { type: "string", description: "Optional notes" },
        month: { type: "string", description: "Month in YYYY-MM-DD format (first of month). Defaults to current month." },
      },
      required: ["category", "amount"],
    },
  },
];

/* ------------------------------------------------------------------ */
/*  Tool execution                                                      */
/* ------------------------------------------------------------------ */

async function executeTool(
  toolName: string,
  toolInput: Record<string, unknown>,
  companyId: string,
  sb: SupabaseClient,
): Promise<string> {
  const now = new Date();
  const fmt = (n: number) => n.toLocaleString("el-GR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const defaultFromDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const today = now.toISOString().split("T")[0];

  try {
    switch (toolName) {
      case "query_invoices": {
        let query = sb
          .from("invoices")
          .select("id, invoice_number, total_amount, status, invoice_date, due_date, notes, supplier:suppliers(name)")
          .eq("company_id", companyId);

        if (toolInput.status) query = query.eq("status", toolInput.status);
        if (toolInput.from_date) query = query.gte("invoice_date", toolInput.from_date);
        if (toolInput.to_date) query = query.lte("invoice_date", toolInput.to_date);
        if (toolInput.min_amount) query = query.gte("total_amount", toolInput.min_amount);
        if (toolInput.max_amount) query = query.lte("total_amount", toolInput.max_amount);

        const orderField = (toolInput.order_by as string) || "invoice_date";
        query = query.order(orderField, { ascending: toolInput.ascending === true });
        query = query.limit(Math.min((toolInput.limit as number) || 25, 100));

        const { data, error } = await query;
        if (error) return JSON.stringify({ error: error.message });

        // Filter by supplier name if provided (post-query since it's a relation)
        let results = data || [];
        if (toolInput.supplier_name) {
          const searchName = (toolInput.supplier_name as string).toLowerCase();
          results = results.filter((inv: any) =>
            inv.supplier?.name?.toLowerCase().includes(searchName)
          );
        }

        return JSON.stringify({
          total_results: results.length,
          invoices: results.map((inv: any) => ({
            id: inv.id,
            number: inv.invoice_number,
            amount: `€${fmt(inv.total_amount || 0)}`,
            status: inv.status,
            supplier: inv.supplier?.name || "Unknown",
            date: inv.invoice_date,
            due_date: inv.due_date,
            notes: inv.notes,
          })),
        });
      }

      case "query_revenue": {
        const fromDate = (toolInput.from_date as string) || defaultFromDate;
        const toDate = (toolInput.to_date as string) || today;

        const { data, error } = await sb
          .from("revenue_entries")
          .select("amount, entry_date, description, category")
          .eq("company_id", companyId)
          .gte("entry_date", fromDate)
          .lte("entry_date", toDate)
          .order("entry_date", { ascending: true });

        if (error) return JSON.stringify({ error: error.message });

        const entries = data || [];
        const totalRevenue = entries.reduce((s: number, r: any) => s + (r.amount || 0), 0);

        if (toolInput.group_by === "category") {
          const groups = new Map<string, number>();
          entries.forEach((e: any) => {
            const cat = e.category || "Other";
            groups.set(cat, (groups.get(cat) || 0) + (e.amount || 0));
          });
          return JSON.stringify({
            period: `${fromDate} to ${toDate}`,
            total_revenue: `€${fmt(totalRevenue)}`,
            entries_count: entries.length,
            by_category: Object.fromEntries([...groups.entries()].map(([k, v]) => [k, `€${fmt(v)}`])),
          });
        }

        if (toolInput.group_by === "month") {
          const groups = new Map<string, number>();
          entries.forEach((e: any) => {
            const month = e.entry_date.substring(0, 7);
            groups.set(month, (groups.get(month) || 0) + (e.amount || 0));
          });
          return JSON.stringify({
            period: `${fromDate} to ${toDate}`,
            total_revenue: `€${fmt(totalRevenue)}`,
            entries_count: entries.length,
            by_month: Object.fromEntries([...groups.entries()].map(([k, v]) => [k, `€${fmt(v)}`])),
          });
        }

        if (toolInput.group_by === "day") {
          const groups = new Map<string, number>();
          entries.forEach((e: any) => {
            groups.set(e.entry_date, (groups.get(e.entry_date) || 0) + (e.amount || 0));
          });
          return JSON.stringify({
            period: `${fromDate} to ${toDate}`,
            total_revenue: `€${fmt(totalRevenue)}`,
            entries_count: entries.length,
            by_day: Object.fromEntries([...groups.entries()].map(([k, v]) => [k, `€${fmt(v)}`])),
          });
        }

        return JSON.stringify({
          period: `${fromDate} to ${toDate}`,
          total_revenue: `€${fmt(totalRevenue)}`,
          entries_count: entries.length,
          entries: entries.slice(0, 50).map((e: any) => ({
            date: e.entry_date,
            amount: `€${fmt(e.amount || 0)}`,
            description: e.description,
            category: e.category,
          })),
        });
      }

      case "query_expenses": {
        const fromDate = (toolInput.from_date as string) || defaultFromDate;
        const toDate = (toolInput.to_date as string) || today;

        let query = sb
          .from("expense_entries")
          .select("amount, entry_date, description, category")
          .eq("company_id", companyId)
          .gte("entry_date", fromDate)
          .lte("entry_date", toDate)
          .order("entry_date", { ascending: true });

        if (toolInput.category) query = query.eq("category", toolInput.category);

        const { data, error } = await query;
        if (error) return JSON.stringify({ error: error.message });

        const entries = data || [];
        const totalExpenses = entries.reduce((s: number, r: any) => s + (r.amount || 0), 0);

        if (toolInput.group_by === "category") {
          const groups = new Map<string, { total: number; count: number }>();
          entries.forEach((e: any) => {
            const cat = e.category || "Other";
            const existing = groups.get(cat) || { total: 0, count: 0 };
            existing.total += e.amount || 0;
            existing.count += 1;
            groups.set(cat, existing);
          });
          return JSON.stringify({
            period: `${fromDate} to ${toDate}`,
            total_expenses: `€${fmt(totalExpenses)}`,
            entries_count: entries.length,
            by_category: Object.fromEntries(
              [...groups.entries()]
                .sort((a, b) => b[1].total - a[1].total)
                .map(([k, v]) => [k, { amount: `€${fmt(v.total)}`, count: v.count, percentage: `${(v.total / totalExpenses * 100).toFixed(1)}%` }])
            ),
          });
        }

        if (toolInput.group_by === "month") {
          const groups = new Map<string, number>();
          entries.forEach((e: any) => {
            const month = e.entry_date.substring(0, 7);
            groups.set(month, (groups.get(month) || 0) + (e.amount || 0));
          });
          return JSON.stringify({
            period: `${fromDate} to ${toDate}`,
            total_expenses: `€${fmt(totalExpenses)}`,
            by_month: Object.fromEntries([...groups.entries()].map(([k, v]) => [k, `€${fmt(v)}`])),
          });
        }

        return JSON.stringify({
          period: `${fromDate} to ${toDate}`,
          total_expenses: `€${fmt(totalExpenses)}`,
          entries_count: entries.length,
          entries: entries.slice(0, 50).map((e: any) => ({
            date: e.entry_date,
            amount: `€${fmt(e.amount || 0)}`,
            description: e.description,
            category: e.category,
          })),
        });
      }

      case "query_suppliers": {
        // First get all suppliers for this company
        let supplierQuery = sb
          .from("suppliers")
          .select("id, name, afm, notes")
          .eq("company_id", companyId);

        if (toolInput.name) {
          supplierQuery = supplierQuery.ilike("name", `%${toolInput.name}%`);
        }

        const { data: suppliers, error: supplierError } = await supplierQuery;
        if (supplierError) return JSON.stringify({ error: supplierError.message });

        // Get invoice spending for each supplier
        const fromDate = (toolInput.from_date as string) || new Date(now.getTime() - 90 * 86400000).toISOString().split("T")[0];
        const toDate = (toolInput.to_date as string) || today;

        const supplierIds = (suppliers || []).map((s: any) => s.id);
        const { data: invoices } = await sb
          .from("invoices")
          .select("supplier_id, total_amount, invoice_date, status")
          .eq("company_id", companyId)
          .in("supplier_id", supplierIds)
          .gte("invoice_date", fromDate)
          .lte("invoice_date", toDate);

        const spendingMap = new Map<string, { total: number; count: number; lastDate: string }>();
        (invoices || []).forEach((inv: any) => {
          const existing = spendingMap.get(inv.supplier_id) || { total: 0, count: 0, lastDate: "" };
          existing.total += inv.total_amount || 0;
          existing.count += 1;
          if (inv.invoice_date > existing.lastDate) existing.lastDate = inv.invoice_date;
          spendingMap.set(inv.supplier_id, existing);
        });

        let results = (suppliers || []).map((s: any) => ({
          id: s.id,
          name: s.name,
          afm: s.afm,
          notes: s.notes,
          total_spent: spendingMap.get(s.id)?.total || 0,
          invoice_count: spendingMap.get(s.id)?.count || 0,
          last_invoice: spendingMap.get(s.id)?.lastDate || null,
        }));

        const sortBy = (toolInput.sort_by as string) || "total_spent";
        if (sortBy === "total_spent") results.sort((a, b) => b.total_spent - a.total_spent);
        else if (sortBy === "invoice_count") results.sort((a, b) => b.invoice_count - a.invoice_count);
        else results.sort((a, b) => a.name.localeCompare(b.name));

        const limit = Math.min((toolInput.limit as number) || 20, 50);
        results = results.slice(0, limit);

        return JSON.stringify({
          period: `${fromDate} to ${toDate}`,
          total_suppliers: results.length,
          suppliers: results.map((s) => ({
            ...s,
            total_spent: `€${fmt(s.total_spent)}`,
          })),
        });
      }

      case "query_products": {
        let query = sb
          .from("products")
          .select("id, name, category, type, selling_price_dinein, selling_price_delivery")
          .eq("company_id", companyId);

        if (toolInput.name) query = query.ilike("name", `%${toolInput.name}%`);
        if (toolInput.category) query = query.eq("category", toolInput.category);
        if (toolInput.type) query = query.eq("type", toolInput.type);

        const limit = Math.min((toolInput.limit as number) || 50, 100);
        const { data, error } = await query.limit(limit);
        if (error) return JSON.stringify({ error: error.message });

        let results = (data || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          type: p.type,
          price_dinein: `€${fmt(p.selling_price_dinein || 0)}`,
          price_delivery: `€${fmt(p.selling_price_delivery || 0)}`,
        }));

        // Optionally include ingredients
        if (toolInput.include_ingredients && results.length <= 10) {
          for (const product of results) {
            const { data: ingredients } = await sb
              .from("product_ingredients")
              .select("quantity, unit, ingredient:ingredients(name, price_per_unit, unit)")
              .eq("product_id", product.id);
            (product as any).ingredients = (ingredients || []).map((pi: any) => ({
              name: pi.ingredient?.name,
              quantity: pi.quantity,
              unit: pi.unit,
              unit_cost: pi.ingredient?.price_per_unit ? `€${fmt(pi.ingredient.price_per_unit)}` : null,
            }));
          }
        }

        return JSON.stringify({ total_products: results.length, products: results });
      }

      case "query_ingredients": {
        let query = sb
          .from("ingredients")
          .select("id, name, category, unit, price_per_unit, supplier_name")
          .eq("company_id", companyId);

        if (toolInput.name) query = query.ilike("name", `%${toolInput.name}%`);
        if (toolInput.category) query = query.eq("category", toolInput.category);
        if (toolInput.supplier_name) query = query.ilike("supplier_name", `%${toolInput.supplier_name}%`);

        const sortBy = (toolInput.sort_by as string) || "name";
        query = query.order(sortBy, { ascending: true });

        const limit = Math.min((toolInput.limit as number) || 50, 100);
        const { data, error } = await query.limit(limit);
        if (error) return JSON.stringify({ error: error.message });

        return JSON.stringify({
          total_ingredients: (data || []).length,
          ingredients: (data || []).map((ing: any) => ({
            id: ing.id,
            name: ing.name,
            category: ing.category,
            unit: ing.unit,
            price_per_unit: `€${fmt(ing.price_per_unit || 0)}`,
            supplier: ing.supplier_name,
          })),
        });
      }

      case "get_financial_summary": {
        const fromDate = (toolInput.from_date as string) || defaultFromDate;
        const toDate = (toolInput.to_date as string) || today;

        // Calculate previous period for comparison
        const fromD = new Date(fromDate);
        const toD = new Date(toDate);
        const periodDays = Math.ceil((toD.getTime() - fromD.getTime()) / 86400000);
        const prevFrom = new Date(fromD.getTime() - periodDays * 86400000).toISOString().split("T")[0];
        const prevTo = new Date(fromD.getTime() - 86400000).toISOString().split("T")[0];

        const [revenue, expenses, prevRevenue, prevExpenses, cashPos, overdue, fixedCostsData] = await Promise.all([
          sb.from("revenue_entries").select("amount").eq("company_id", companyId).gte("entry_date", fromDate).lte("entry_date", toDate),
          sb.from("expense_entries").select("amount").eq("company_id", companyId).gte("entry_date", fromDate).lte("entry_date", toDate),
          sb.from("revenue_entries").select("amount").eq("company_id", companyId).gte("entry_date", prevFrom).lte("entry_date", prevTo),
          sb.from("expense_entries").select("amount").eq("company_id", companyId).gte("entry_date", prevFrom).lte("entry_date", prevTo),
          sb.from("cash_positions").select("*").eq("company_id", companyId).order("recorded_date", { ascending: false }).limit(1),
          sb.from("invoices").select("total_amount").eq("company_id", companyId).eq("status", "approved").lt("due_date", today),
          sb.from("fixed_costs").select("category, amount").eq("company_id", companyId).eq("month", `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`),
        ]);

        const sumArr = (data: any[] | null) => (data || []).reduce((s, r) => s + (r.amount || 0), 0);
        const rev = sumArr(revenue.data);
        const exp = sumArr(expenses.data);
        const prevRev = sumArr(prevRevenue.data);
        const prevExp = sumArr(prevExpenses.data);
        const profit = rev - exp;
        const prevProfit = prevRev - prevExp;
        const cash = (cashPos.data || [])[0];
        const overdueTotal = sumArr(overdue.data);
        const fixedTotal = sumArr(fixedCostsData.data);

        return JSON.stringify({
          current_period: { from: fromDate, to: toDate },
          previous_period: { from: prevFrom, to: prevTo },
          revenue: `€${fmt(rev)}`,
          expenses: `€${fmt(exp)}`,
          net_profit: `€${fmt(profit)}`,
          profit_margin: rev > 0 ? `${(profit / rev * 100).toFixed(1)}%` : "N/A",
          previous_revenue: `€${fmt(prevRev)}`,
          previous_expenses: `€${fmt(prevExp)}`,
          previous_profit: `€${fmt(prevProfit)}`,
          revenue_change: prevRev > 0 ? `${((rev - prevRev) / prevRev * 100).toFixed(1)}%` : "N/A",
          expense_change: prevExp > 0 ? `${((exp - prevExp) / prevExp * 100).toFixed(1)}%` : "N/A",
          profit_change: prevProfit !== 0 ? `${((profit - prevProfit) / Math.abs(prevProfit) * 100).toFixed(1)}%` : "N/A",
          cash_position: cash ? {
            cash_on_hand: `€${fmt(cash.cash_on_hand || 0)}`,
            bank_balance: `€${fmt(cash.bank_balance || 0)}`,
            total_cash: `€${fmt(cash.total_cash || 0)}`,
            as_of: cash.recorded_date,
          } : null,
          overdue_invoices_total: `€${fmt(overdueTotal)}`,
          overdue_invoice_count: (overdue.data || []).length,
          monthly_fixed_costs: `€${fmt(fixedTotal)}`,
        });
      }

      case "get_cash_position": {
        if (toolInput.history_days) {
          const fromDate = new Date(now.getTime() - (toolInput.history_days as number) * 86400000).toISOString().split("T")[0];
          const { data, error } = await sb
            .from("cash_positions")
            .select("*")
            .eq("company_id", companyId)
            .gte("recorded_date", fromDate)
            .order("recorded_date", { ascending: true });
          if (error) return JSON.stringify({ error: error.message });
          return JSON.stringify({
            positions: (data || []).map((p: any) => ({
              date: p.recorded_date,
              cash_on_hand: `€${fmt(p.cash_on_hand || 0)}`,
              bank_balance: `€${fmt(p.bank_balance || 0)}`,
              total: `€${fmt(p.total_cash || 0)}`,
            })),
          });
        }

        let query = sb.from("cash_positions").select("*").eq("company_id", companyId);
        if (toolInput.date) {
          query = query.lte("recorded_date", toolInput.date);
        }
        const { data, error } = await query.order("recorded_date", { ascending: false }).limit(1);
        if (error) return JSON.stringify({ error: error.message });

        const pos = (data || [])[0];
        if (!pos) return JSON.stringify({ message: "No cash position data found" });

        return JSON.stringify({
          date: pos.recorded_date,
          cash_on_hand: `€${fmt(pos.cash_on_hand || 0)}`,
          bank_balance: `€${fmt(pos.bank_balance || 0)}`,
          total_cash: `€${fmt(pos.total_cash || 0)}`,
        });
      }

      case "query_fixed_costs": {
        const month = (toolInput.month as string) || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

        let query = sb.from("fixed_costs").select("*").eq("company_id", companyId).eq("month", month);
        if (toolInput.category) query = query.eq("category", toolInput.category);

        const { data, error } = await query;
        if (error) return JSON.stringify({ error: error.message });

        const total = (data || []).reduce((s: number, c: any) => s + (c.amount || 0), 0);
        return JSON.stringify({
          month,
          total_fixed_costs: `€${fmt(total)}`,
          costs: (data || []).map((c: any) => ({
            category: c.category,
            amount: `€${fmt(c.amount || 0)}`,
            notes: c.notes,
          })),
        });
      }

      case "get_overdue_invoices": {
        const { data, error } = await sb
          .from("invoices")
          .select("id, invoice_number, total_amount, due_date, invoice_date, supplier:suppliers(name)")
          .eq("company_id", companyId)
          .eq("status", "approved")
          .lt("due_date", today)
          .order("due_date", { ascending: true })
          .limit(Math.min((toolInput.limit as number) || 20, 50));

        if (error) return JSON.stringify({ error: error.message });

        let results = (data || []).map((inv: any) => {
          const daysOverdue = Math.floor((now.getTime() - new Date(inv.due_date).getTime()) / 86400000);
          return {
            id: inv.id,
            number: inv.invoice_number,
            amount: `€${fmt(inv.total_amount || 0)}`,
            supplier: inv.supplier?.name || "Unknown",
            due_date: inv.due_date,
            days_overdue: daysOverdue,
          };
        });

        if (toolInput.min_days_overdue) {
          results = results.filter((r) => r.days_overdue >= (toolInput.min_days_overdue as number));
        }

        const totalOverdue = results.reduce((s, r) => s + parseFloat(r.amount.replace(/[€.]/g, "").replace(",", ".")), 0);
        return JSON.stringify({
          overdue_count: results.length,
          total_overdue: `€${fmt(totalOverdue)}`,
          invoices: results,
        });
      }

      case "get_scheduled_payments": {
        const status = (toolInput.status as string) || "pending";
        let query = sb
          .from("scheduled_payments")
          .select("*")
          .eq("company_id", companyId)
          .eq("status", status)
          .order("due_date", { ascending: true });

        if (toolInput.from_date) query = query.gte("due_date", toolInput.from_date);
        if (toolInput.to_date) query = query.lte("due_date", toolInput.to_date);

        const { data, error } = await query.limit(Math.min((toolInput.limit as number) || 20, 50));
        if (error) return JSON.stringify({ error: error.message });

        const total = (data || []).reduce((s: number, p: any) => s + (p.amount || 0), 0);
        return JSON.stringify({
          total_pending: `€${fmt(total)}`,
          count: (data || []).length,
          payments: (data || []).map((p: any) => ({
            description: p.description,
            amount: `€${fmt(p.amount || 0)}`,
            due_date: p.due_date,
            status: p.status,
          })),
        });
      }

      case "get_alerts": {
        let query = sb
          .from("alerts")
          .select("*")
          .eq("company_id", companyId)
          .order("created_at", { ascending: false });

        if (toolInput.severity) query = query.eq("severity", toolInput.severity);
        if (toolInput.status) query = query.eq("status", toolInput.status);
        else query = query.eq("status", "active");

        const { data, error } = await query.limit(Math.min((toolInput.limit as number) || 20, 50));
        if (error) return JSON.stringify({ error: error.message });

        return JSON.stringify({
          alert_count: (data || []).length,
          alerts: (data || []).map((a: any) => ({
            title: a.title,
            description: a.description,
            severity: a.severity,
            status: a.status,
            created: a.created_at,
          })),
        });
      }

      // ===== WRITE OPERATIONS =====
      case "update_invoice_status": {
        const updateData: any = { status: toolInput.new_status };
        if (toolInput.notes) updateData.notes = toolInput.notes;

        const { data, error } = await sb
          .from("invoices")
          .update(updateData)
          .eq("id", toolInput.invoice_id)
          .eq("company_id", companyId)
          .select("id, invoice_number, status, total_amount")
          .single();

        if (error) return JSON.stringify({ error: error.message });
        return JSON.stringify({
          success: true,
          message: `Invoice ${data.invoice_number} status updated to "${data.status}"`,
          invoice: { id: data.id, number: data.invoice_number, status: data.status, amount: `€${fmt(data.total_amount || 0)}` },
        });
      }

      case "create_alert_rule": {
        const { data, error } = await sb
          .from("custom_alert_rules")
          .insert({
            company_id: companyId,
            alert_type: toolInput.alert_type,
            category: toolInput.category,
            threshold_value: toolInput.threshold_value || null,
            threshold_unit: toolInput.threshold_unit || null,
            comparison_period: toolInput.comparison_period || null,
            severity: toolInput.severity,
            enabled: true,
            notes: toolInput.notes || null,
          })
          .select()
          .single();

        if (error) return JSON.stringify({ error: error.message });
        return JSON.stringify({
          success: true,
          message: `Alert rule "${data.alert_type}" created successfully`,
          rule_id: data.id,
        });
      }

      case "create_fixed_cost": {
        const month = (toolInput.month as string) || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

        const { data, error } = await sb
          .from("fixed_costs")
          .insert({
            company_id: companyId,
            category: toolInput.category,
            amount: toolInput.amount,
            notes: toolInput.notes || null,
            month,
          })
          .select()
          .single();

        if (error) return JSON.stringify({ error: error.message });
        return JSON.stringify({
          success: true,
          message: `Fixed cost "${data.category}" of €${fmt(data.amount)} added for ${month}`,
        });
      }

      case "query_invoice_line_items": {
        const lim = Math.min(Number(toolInput.limit) || 50, 200);
        const orderBy = (toolInput.order_by as string) || "description";
        const ascending = toolInput.ascending !== false;

        // If we have a specific invoice_id, get line items directly
        if (toolInput.invoice_id) {
          let query = sb
            .from("invoice_line_items")
            .select("id, invoice_id, description, quantity, unit_price, line_total, tax_rate")
            .eq("invoice_id", toolInput.invoice_id as string);

          if (toolInput.description_search) {
            query = query.ilike("description", `%${toolInput.description_search}%`);
          }
          if (toolInput.min_unit_price) query = query.gte("unit_price", toolInput.min_unit_price);
          if (toolInput.max_unit_price) query = query.lte("unit_price", toolInput.max_unit_price);

          query = query.order(orderBy, { ascending }).limit(lim);

          const { data, error } = await query;
          if (error) return JSON.stringify({ error: error.message });

          // Also get the invoice info for context
          const { data: inv } = await sb
            .from("invoices")
            .select("invoice_number, invoice_date, total_amount, supplier_id, suppliers!inner(name)")
            .eq("id", toolInput.invoice_id as string)
            .single();

          return JSON.stringify({
            invoice_info: inv ? {
              invoice_number: inv.invoice_number,
              invoice_date: inv.invoice_date,
              total_amount: inv.total_amount,
              supplier: (inv as any).suppliers?.name,
            } : null,
            line_items: data,
            count: data?.length || 0,
          });
        }

        // Search across all invoices by description and/or supplier
        // We need to join with invoices (and suppliers) for context
        let query = sb
          .from("invoice_line_items")
          .select("id, invoice_id, description, quantity, unit_price, line_total, tax_rate, invoices!inner(id, invoice_number, invoice_date, total_amount, supplier_id, suppliers(name))")
          .eq("company_id", companyId);

        if (toolInput.description_search) {
          query = query.ilike("description", `%${toolInput.description_search}%`);
        }
        if (toolInput.from_date) {
          query = query.gte("invoices.invoice_date", toolInput.from_date);
        }
        if (toolInput.to_date) {
          query = query.lte("invoices.invoice_date", toolInput.to_date);
        }
        if (toolInput.supplier_name) {
          query = query.ilike("invoices.suppliers.name", `%${toolInput.supplier_name}%`);
        }
        if (toolInput.min_unit_price) query = query.gte("unit_price", toolInput.min_unit_price);
        if (toolInput.max_unit_price) query = query.lte("unit_price", toolInput.max_unit_price);

        query = query.order(orderBy, { ascending }).limit(lim);

        const { data, error } = await query;
        if (error) return JSON.stringify({ error: error.message });

        // Flatten the response for readability
        const items = (data || []).map((item: any) => ({
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          line_total: item.line_total,
          tax_rate: item.tax_rate,
          invoice_number: item.invoices?.invoice_number,
          invoice_date: item.invoices?.invoice_date,
          supplier: item.invoices?.suppliers?.name,
        }));

        const totalSpent = items.reduce((s: number, i: any) => s + (i.line_total || 0), 0);
        return JSON.stringify({
          line_items: items,
          count: items.length,
          total_line_items_amount: `€${fmt(totalSpent)}`,
          note: items.length === lim ? `Results limited to ${lim}. Use a more specific search or increase limit.` : undefined,
        });
      }

      default:
        return JSON.stringify({ error: `Unknown tool: ${toolName}` });
    }
  } catch (err) {
    console.error(`Tool ${toolName} execution error:`, err);
    return JSON.stringify({ error: `Tool execution failed: ${err instanceof Error ? err.message : "Unknown error"}` });
  }
}

/* ------------------------------------------------------------------ */
/*  Main handler                                                        */
/* ------------------------------------------------------------------ */

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await sb.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { company_id, messages, language } = body as {
      company_id: string;
      messages: { role: string; content: string }[];
      language?: string;
    };

    if (!company_id || !messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Missing company_id or messages" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const systemPrompt = buildSystemPrompt(language || "el", todayStr);

    // Build the API messages from conversation history
    const apiMessages: AnthropicMessage[] = messages.map((m) => ({
      role: m.role === "user" ? "user" as const : "assistant" as const,
      content: m.content,
    }));

    // ====================================================
    // TOOL USE LOOP: Let Claude call tools, then respond
    // ====================================================

    let toolRounds = 0;
    let lastResult = await callAnthropic(systemPrompt, apiMessages, true);

    // Agentic loop: keep going while Claude wants to use tools
    while (lastResult.stop_reason === "tool_use" && toolRounds < MAX_TOOL_ROUNDS) {
      toolRounds++;

      // Add assistant's tool-calling message to conversation
      apiMessages.push({
        role: "assistant",
        content: lastResult.content,
      });

      // Execute all tool calls in parallel
      const toolUseBlocks = lastResult.content.filter((b: any) => b.type === "tool_use");
      const toolResults = await Promise.all(
        toolUseBlocks.map(async (block: any) => {
          console.log(`Executing tool: ${block.name}`, JSON.stringify(block.input).slice(0, 200));
          const result = await executeTool(block.name, block.input, company_id, sb);
          console.log('Tool result for ' + block.name + ':', result.substring(0, 300));
          return {
            type: "tool_result",
            tool_use_id: block.id,
            content: result,
          };
        })
      );

      // Add tool results to conversation
      apiMessages.push({
        role: "user",
        content: toolResults as any,
      });

      // Call Claude again with tool results
      lastResult = await callAnthropic(systemPrompt, apiMessages, true);
    }

    // ====================================================
    // FINAL RESPONSE: Stream Claude's text response back
    // ====================================================

    // If the last result already has text (non-streaming from tool loop), we can stream it ourselves
    // OR do a final streaming call for the best UX

    const textBlocks = lastResult.content.filter((b: any) => b.type === "text");
    const toolCallBlocks = lastResult.content.filter((b: any) => b.type === "tool_use");

    // If there are tool call results to report, include them in the stream
    const responseHeaders = {
      ...CORS_HEADERS,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    };

    // Create a custom readable stream that sends tool call info + the final text
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send tool call indicators so the frontend knows what happened
          if (toolRounds > 0) {
            // Collect all tool calls that were made
            const allToolCalls: Array<{ name: string; input: Record<string, unknown> }> = [];
            for (const msg of apiMessages) {
              if (msg.role === "assistant" && Array.isArray(msg.content)) {
                for (const block of msg.content) {
                  if ((block as any).type === "tool_use") {
                    allToolCalls.push({
                      name: (block as any).name,
                      input: (block as any).input,
                    });
                  }
                }
              }
            }
            controller.enqueue(encodeSSE("tool_calls", { tools: allToolCalls }));
          }

          // Stream the final text response
          if (textBlocks.length > 0) {
            const fullText = textBlocks.map((b: any) => b.text).join("\n");
            // Simulate streaming by chunking the text (for consistent UX)
            const chunkSize = 20;
            for (let i = 0; i < fullText.length; i += chunkSize) {
              const chunk = fullText.slice(i, i + chunkSize);
              controller.enqueue(
                encodeSSE("content_block_delta", {
                  type: "content_block_delta",
                  delta: { type: "text_delta", text: chunk },
                })
              );
              // Small delay between chunks for natural streaming feel
              await new Promise((r) => setTimeout(r, 15));
            }
          }

          controller.enqueue(encodeSSE("message_stop", { type: "message_stop" }));
          controller.close();
        } catch (err) {
          console.error("Stream error:", err);
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      status: 200,
      headers: responseHeaders,
    });

  } catch (err) {
    console.error("ai-chat error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
