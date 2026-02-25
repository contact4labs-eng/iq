// supabase/functions/ai-chat/tools.ts
// Tool definitions and execution logic for the AI agent

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

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
/*  Tool definitions for Anthropic API                                  */
/* ------------------------------------------------------------------ */

export const TOOL_DEFINITIONS: ToolDefinition[] = [
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
        name: { type: "string", description: "Name for the alert rule" },
        description: { type: "string", description: "Description of what this alert monitors" },
        category: { type: "string", enum: ["sales", "customer", "smart"], description: "Alert category" },
        condition_type: { type: "string", description: "Type of condition to monitor" },
        threshold_value: { type: "number", description: "Threshold value that triggers the alert" },
        severity: { type: "string", enum: ["critical", "warning", "info"], description: "Severity level" },
      },
      required: ["name", "category", "severity"],
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

export async function executeTool(
  toolName: string,
  toolInput: Record<string, unknown>,
  companyId: string,
  sb: SupabaseClient
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
          .select("id, invoice_number, total_amount, status, invoice_date, due_date, paid_date, notes, supplier:suppliers(name)")
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
            paid_date: inv.paid_date,
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
          .select("id, name, afm, contact_person, email, phone, address")
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
          contact: s.contact_person,
          email: s.email,
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
          .select("id, name, category, type, selling_price_dinein, selling_price_delivery, cost_price")
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
          cost_price: p.cost_price ? `€${fmt(p.cost_price)}` : null,
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
          .select("id, name, category, unit, price_per_unit, supplier_name, min_stock_level, current_stock")
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
            current_stock: ing.current_stock,
            min_stock: ing.min_stock_level,
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
            message: a.message,
            severity: a.severity,
            status: a.status,
            created: a.created_at,
          })),
        });
      }

      // ===== WRITE OPERATIONS =====
      case "update_invoice_status": {
        const updateData: any = { status: toolInput.new_status };
        if (toolInput.new_status === "paid") updateData.paid_date = today;
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
            name: toolInput.name,
            description: toolInput.description || null,
            category: toolInput.category,
            condition_type: toolInput.condition_type || null,
            threshold_value: toolInput.threshold_value || null,
            severity: toolInput.severity,
            is_active: true,
          })
          .select()
          .single();

        if (error) return JSON.stringify({ error: error.message });
        return JSON.stringify({
          success: true,
          message: `Alert rule "${data.name}" created successfully`,
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

      default:
        return JSON.stringify({ error: `Unknown tool: ${toolName}` });
    }
  } catch (err) {
    console.error(`Tool ${toolName} execution error:`, err);
    return JSON.stringify({ error: `Tool execution failed: ${err instanceof Error ? err.message : "Unknown error"}` });
  }
}
