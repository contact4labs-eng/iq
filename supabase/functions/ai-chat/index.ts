// supabase/functions/ai-chat/index.ts
// Deploy: supabase functions deploy ai-chat
// Required secret: ANTHROPIC_API_KEY (set via supabase secrets set ANTHROPIC_API_KEY=sk-ant-...)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/* ------------------------------------------------------------------ */
/*  Fetch business context from DB                                     */
/* ------------------------------------------------------------------ */

async function fetchBusinessContext(companyId: string): Promise<string> {
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split("T")[0];
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split("T")[0];
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString().split("T")[0];

  // Run all queries in parallel
  const [
    revenueThisMonth,
    expensesThisMonth,
    revenuePrevMonth,
    expensesPrevMonth,
    topSuppliers,
    overdueInvoices,
    recentInvoices,
    scheduledPayments,
    products,
    ingredients,
    fixedCosts,
    cashPosition,
    invoiceActivity,
    expenseBreakdown,
  ] = await Promise.all([
    // Revenue this month
    sb.from("revenue_entries").select("amount").eq("company_id", companyId)
      .gte("entry_date", startOfMonth),
    // Expenses this month
    sb.from("expense_entries").select("amount").eq("company_id", companyId)
      .gte("entry_date", startOfMonth),
    // Revenue prev month
    sb.from("revenue_entries").select("amount").eq("company_id", companyId)
      .gte("entry_date", prevMonthStart).lte("entry_date", prevMonthEnd),
    // Expenses prev month
    sb.from("expense_entries").select("amount").eq("company_id", companyId)
      .gte("entry_date", prevMonthStart).lte("entry_date", prevMonthEnd),
    // Top suppliers (last 90 days)
    sb.from("invoices").select("supplier:suppliers(name), total_amount")
      .eq("company_id", companyId).eq("status", "approved")
      .gte("invoice_date", new Date(now.getTime() - 90 * 86400000).toISOString().split("T")[0])
      .order("total_amount", { ascending: false }).limit(50),
    // Overdue invoices
    sb.from("invoices").select("invoice_number, total_amount, due_date, supplier:suppliers(name)")
      .eq("company_id", companyId).eq("status", "approved")
      .lt("due_date", now.toISOString().split("T")[0])
      .order("due_date", { ascending: true }).limit(10),
    // Recent invoices (last 30 days)
    sb.from("invoices").select("invoice_number, total_amount, status, invoice_date, supplier:suppliers(name)")
      .eq("company_id", companyId)
      .gte("invoice_date", thirtyDaysAgo)
      .order("invoice_date", { ascending: false }).limit(20),
    // Scheduled payments
    sb.from("scheduled_payments").select("description, amount, due_date, status")
      .eq("company_id", companyId).eq("status", "pending")
      .order("due_date", { ascending: true }).limit(10),
    // Products
    sb.from("products").select("name, category, type, selling_price_dinein, selling_price_delivery")
      .eq("company_id", companyId).limit(50),
    // Ingredients
    sb.from("ingredients").select("name, category, unit, price_per_unit, supplier_name")
      .eq("company_id", companyId).limit(50),
    // Fixed costs (current month)
    sb.from("fixed_costs").select("category, amount, notes")
      .eq("company_id", companyId).eq("month", `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`),
    // Cash position (latest)
    sb.from("cash_positions").select("cash_on_hand, bank_balance, total_cash, recorded_date")
      .eq("company_id", companyId).order("recorded_date", { ascending: false }).limit(1),
    // Invoice activity stats
    sb.from("invoices").select("status, paid_date, invoice_date, total_amount")
      .eq("company_id", companyId).gte("invoice_date", thirtyDaysAgo),
    // Expense breakdown by category (via RPC if available, otherwise skip)
    sb.rpc("get_expense_category_breakdown", {
      p_company_id: companyId,
      p_from_date: startOfMonth,
      p_to_date: now.toISOString().split("T")[0],
    }).then(r => r).catch(() => ({ data: null })),
  ]);

  // Aggregate supplier spending
  const supplierMap = new Map<string, { total: number; count: number }>();
  if (topSuppliers.data) {
    for (const inv of topSuppliers.data as any[]) {
      const name = inv.supplier?.name || "Unknown";
      const existing = supplierMap.get(name) || { total: 0, count: 0 };
      existing.total += inv.total_amount || 0;
      existing.count += 1;
      supplierMap.set(name, existing);
    }
  }
  const sortedSuppliers = [...supplierMap.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 10);

  // Compute totals
  const sumArr = (data: any[] | null) => (data || []).reduce((s, r) => s + (r.amount || 0), 0);
  const revThis = sumArr(revenueThisMonth.data);
  const expThis = sumArr(expensesThisMonth.data);
  const revPrev = sumArr(revenuePrevMonth.data);
  const expPrev = sumArr(expensesPrevMonth.data);

  // Invoice activity
  const invoiceData = (invoiceActivity.data || []) as any[];
  const receivedThisMonth = invoiceData.filter((i: any) => i.invoice_date >= startOfMonth).length;
  const paidThisMonth = invoiceData.filter((i: any) => i.paid_date && i.paid_date >= startOfMonth).length;
  const overdueCount = (overdueInvoices.data || []).length;

  const cash = (cashPosition.data || [])[0];

  const fmt = (n: number) => n.toLocaleString("el-GR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Build context string
  let ctx = `=== BUSINESS DATA SNAPSHOT (${now.toISOString().split("T")[0]}) ===\n\n`;

  ctx += `## FINANCIAL OVERVIEW\n`;
  ctx += `Revenue this month: €${fmt(revThis)}\n`;
  ctx += `Expenses this month: €${fmt(expThis)}\n`;
  ctx += `Net profit this month: €${fmt(revThis - expThis)}\n`;
  ctx += `Profit margin: ${revThis > 0 ? ((revThis - expThis) / revThis * 100).toFixed(1) : "0"}%\n`;
  ctx += `Revenue last month: €${fmt(revPrev)}\n`;
  ctx += `Expenses last month: €${fmt(expPrev)}\n`;
  ctx += `Net profit last month: €${fmt(revPrev - expPrev)}\n`;
  if (revPrev > 0) {
    const revChange = ((revThis - revPrev) / revPrev * 100).toFixed(1);
    ctx += `Revenue change month-over-month: ${revChange}%\n`;
  }
  ctx += `\n`;

  if (cash) {
    ctx += `## CASH POSITION\n`;
    ctx += `Cash on hand: €${fmt(cash.cash_on_hand || 0)}\n`;
    ctx += `Bank balance: €${fmt(cash.bank_balance || 0)}\n`;
    ctx += `Total cash: €${fmt(cash.total_cash || 0)}\n`;
    ctx += `As of: ${cash.recorded_date}\n\n`;
  }

  ctx += `## INVOICE ACTIVITY (Last 30 days)\n`;
  ctx += `Invoices received this month: ${receivedThisMonth}\n`;
  ctx += `Invoices paid this month: ${paidThisMonth}\n`;
  ctx += `Overdue invoices: ${overdueCount}\n\n`;

  if ((overdueInvoices.data || []).length > 0) {
    ctx += `## OVERDUE INVOICES\n`;
    for (const inv of overdueInvoices.data as any[]) {
      const daysOverdue = Math.floor((now.getTime() - new Date(inv.due_date).getTime()) / 86400000);
      ctx += `- ${inv.invoice_number}: €${fmt(inv.total_amount)} from ${inv.supplier?.name || "Unknown"} (${daysOverdue} days overdue)\n`;
    }
    ctx += `\n`;
  }

  if (sortedSuppliers.length > 0) {
    ctx += `## TOP SUPPLIERS (Last 90 days)\n`;
    for (const [name, data] of sortedSuppliers) {
      ctx += `- ${name}: €${fmt(data.total)} (${data.count} invoices)\n`;
    }
    ctx += `\n`;
  }

  if ((scheduledPayments.data || []).length > 0) {
    ctx += `## UPCOMING PAYMENTS\n`;
    for (const p of scheduledPayments.data as any[]) {
      ctx += `- ${p.description}: €${fmt(p.amount)} due ${p.due_date}\n`;
    }
    ctx += `\n`;
  }

  if (expenseBreakdown.data && Array.isArray(expenseBreakdown.data) && expenseBreakdown.data.length > 0) {
    ctx += `## EXPENSE BREAKDOWN (This month)\n`;
    for (const cat of expenseBreakdown.data as any[]) {
      ctx += `- ${cat.category || "Other"}: €${fmt(cat.total || 0)} (${(cat.percentage || 0).toFixed(1)}%)\n`;
    }
    ctx += `\n`;
  }

  if ((fixedCosts.data || []).length > 0) {
    ctx += `## FIXED COSTS (This month)\n`;
    const totalFixed = (fixedCosts.data as any[]).reduce((s: number, c: any) => s + (c.amount || 0), 0);
    for (const c of fixedCosts.data as any[]) {
      ctx += `- ${c.category}: €${fmt(c.amount)}${c.notes ? ` (${c.notes})` : ""}\n`;
    }
    ctx += `Total fixed costs: €${fmt(totalFixed)}\n\n`;
  }

  if ((products.data || []).length > 0) {
    ctx += `## PRODUCTS (${(products.data || []).length} total)\n`;
    for (const p of (products.data || []).slice(0, 30) as any[]) {
      ctx += `- ${p.name} [${p.category}]: Dine-in €${fmt(p.selling_price_dinein || 0)}, Delivery €${fmt(p.selling_price_delivery || 0)}\n`;
    }
    if ((products.data || []).length > 30) ctx += `... and ${(products.data || []).length - 30} more products\n`;
    ctx += `\n`;
  }

  if ((ingredients.data || []).length > 0) {
    ctx += `## INGREDIENTS (${(ingredients.data || []).length} total)\n`;
    for (const ing of (ingredients.data || []).slice(0, 30) as any[]) {
      ctx += `- ${ing.name} [${ing.category}]: €${fmt(ing.price_per_unit || 0)}/${ing.unit}${ing.supplier_name ? ` from ${ing.supplier_name}` : ""}\n`;
    }
    if ((ingredients.data || []).length > 30) ctx += `... and ${(ingredients.data || []).length - 30} more ingredients\n`;
    ctx += `\n`;
  }

  if ((recentInvoices.data || []).length > 0) {
    ctx += `## RECENT INVOICES (Last 30 days)\n`;
    for (const inv of (recentInvoices.data || []).slice(0, 15) as any[]) {
      ctx += `- ${inv.invoice_number}: €${fmt(inv.total_amount)} from ${inv.supplier?.name || "Unknown"} [${inv.status}] (${inv.invoice_date})\n`;
    }
    ctx += `\n`;
  }

  return ctx;
}

/* ------------------------------------------------------------------ */
/*  System prompt                                                       */
/* ------------------------------------------------------------------ */

function buildSystemPrompt(businessContext: string, language: string): string {
  const lang = language === "el" ? "Greek" : "English";

  return `You are the AI financial analyst for 4Labs, a business management platform for food & beverage companies. You help business owners understand their finances, suppliers, costs, products, and make better decisions.

## Your Personality
- Professional yet friendly and approachable
- You speak in ${lang} by default (match the user's language)
- Concise but thorough — give actionable insights, not just numbers
- When you spot a problem (overdue invoices, declining margins, high dependency on one supplier), flag it proactively
- Use formatting (bold, lists, tables) when it helps clarity
- Always base your answers on the actual business data provided below
- If you don't have enough data to answer a question, say so honestly
- If a question is outside your business data scope, politely explain what you CAN help with

## Your Capabilities
- Financial analysis: revenue, expenses, profit margins, cash flow, trends
- Supplier analysis: spending patterns, dependency risk, price changes
- Invoice management: overdue tracking, payment cycles, expense categorization
- Product & cost analysis: product margins, ingredient costs, recipe costing
- Business recommendations: cost-cutting suggestions, growth opportunities, risk alerts
- General business Q&A: you can answer general business/finance questions using your knowledge

## Response Guidelines
- Keep answers focused and under 400 words unless the user asks for detail
- Use € for currency, format numbers with 2 decimal places
- When comparing periods, show the percentage change
- Highlight concerning trends with warnings
- End with a practical recommendation or next step when appropriate
- Use markdown formatting: **bold** for emphasis, bullet lists for multiple items, tables for comparisons

## Current Business Data
${businessContext}

Use this data to answer the user's questions accurately. Reference specific numbers and dates. If the data shows a concerning trend, mention it even if not directly asked.`;
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

    // Verify token and get user
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

    // Fetch business context
    const businessContext = await fetchBusinessContext(company_id);

    // Build system prompt
    const systemPrompt = buildSystemPrompt(businessContext, language || "el");

    // Call Claude API with streaming
    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        system: systemPrompt,
        messages: messages.map((m) => ({
          role: m.role === "user" ? "user" : "assistant",
          content: m.content,
        })),
        stream: true,
      }),
    });

    if (!anthropicResponse.ok) {
      const errText = await anthropicResponse.text();
      console.error("Anthropic API error:", anthropicResponse.status, errText);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 502,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // Stream the response back to the client
    const responseHeaders = {
      ...CORS_HEADERS,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    };

    // Pipe the Anthropic SSE stream directly to the client
    return new Response(anthropicResponse.body, {
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
