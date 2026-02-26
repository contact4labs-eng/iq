import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Tool definitions for Claude
const TOOLS = [
  {
    name: "get_invoices",
    description: "Search and filter invoices. Returns invoice list with supplier, amount, date, status.",
    input_schema: {
      type: "object",
      properties: {
        supplier_name: { type: "string", description: "Filter by supplier name (partial match)" },
        from_date: { type: "string", description: "Start date YYYY-MM-DD" },
        to_date: { type: "string", description: "End date YYYY-MM-DD" },
        min_amount: { type: "number", description: "Minimum invoice amount" },
        max_amount: { type: "number", description: "Maximum invoice amount" },
        status: { type: "string", enum: ["extracted", "approved", "flagged", "needs_review"] },
        limit: { type: "integer", description: "Max results (default 20)" }
      },
      required: []
    }
  },
  {
    name: "get_supplier_spend",
    description: "Get spending breakdown by supplier with totals, averages, and percentages.",
    input_schema: {
      type: "object",
      properties: {
        months: { type: "integer", description: "How many months back to look (default 3)" }
      },
      required: []
    }
  },
  {
    name: "get_price_changes",
    description: "Get products whose prices changed between invoices. Shows current vs previous price and change percentage.",
    input_schema: { type: "object", properties: {}, required: [] }
  },
  {
    name: "get_payment_analysis",
    description: "Get overdue bills, upcoming payments, and overdue receivables.",
    input_schema: { type: "object", properties: {}, required: [] }
  },
  {
    name: "get_month_comparison",
    description: "Compare two months: revenue, expenses, profit, margin, and category breakdown changes.",
    input_schema: {
      type: "object",
      properties: {
        month1: { type: "string", description: "First month YYYY-MM-DD (default: last month)" },
        month2: { type: "string", description: "Second month YYYY-MM-DD (default: this month)" }
      },
      required: []
    }
  },
  {
    name: "get_expense_categories",
    description: "Get expense breakdown by category with percentages, trends, and growth rates.",
    input_schema: {
      type: "object",
      properties: {
        from_date: { type: "string", description: "Start date YYYY-MM-DD" },
        to_date: { type: "string", description: "End date YYYY-MM-DD" }
      },
      required: []
    }
  },
  {
    name: "get_business_overview",
    description: "Get complete business overview: cash, KPIs, profit pressure, executive summary. Use this for general health questions.",
    input_schema: { type: "object", properties: {}, required: [] }
  }
];

const SYSTEM_PROMPT = `You are a sharp financial analyst for a local business in Greece. You have access to real business data through tools.

RULES:
- ALWAYS call at least one tool before answering. Never guess.
- Use exact numbers from the data. Never fabricate figures.
- Be specific and actionable. Not generic advice.
- Use € for currency.
- If data is insufficient, say so clearly.
- Keep answers concise: 2-4 paragraphs max for questions, structured JSON for full analysis.
- Flag real risks prominently.
- Suggest concrete actions with expected impact.

When generating full insights (no specific question), call get_business_overview first, then call additional tools as needed. Return JSON:
{
  "health_score": 0-100,
  "health_label": "CRITICAL|POOR|FAIR|GOOD|EXCELLENT",
  "headline": "One sentence business state",
  "top_insights": [{"type":"warning|opportunity|info|critical","icon":"⚠️|💡|📊|🔴","title":"Short","detail":"Specific with numbers","action":"What to do"}],
  "expense_insights": [{"type":"warning|opportunity|info","detail":"Finding"}],
  "supplier_insights": [{"type":"warning|opportunity|info","detail":"Finding"}],
  "profit_insight": "Statement about profit",
  "cash_insight": "Statement about cash",
  "what_to_do_this_week": ["Action 1","Action 2","Action 3"],
  "risk_flags": ["Only real risks"]
}

When answering a specific question, return JSON:
{
  "answer": "Detailed answer with specific numbers from tools",
  "data_points": [{"label":"key metric","value":"number"}],
  "confidence": "high|medium|low",
  "follow_up": "Suggested next question"
}`;

// Execute a tool call against Supabase
async function executeTool(toolName: string, input: any, companyId: string): Promise<any> {
  try {
    switch (toolName) {
      case "get_invoices": {
        const { data } = await supabase.rpc("ai_get_invoices", {
          p_company_id: companyId,
          p_supplier_name: input.supplier_name || null,
          p_from_date: input.from_date || null,
          p_to_date: input.to_date || null,
          p_min_amount: input.min_amount || null,
          p_max_amount: input.max_amount || null,
          p_status: input.status || null,
          p_limit: input.limit || 20
        });
        return data;
      }
      case "get_supplier_spend": {
        const { data } = await supabase.rpc("ai_get_supplier_spend", {
          p_company_id: companyId,
          p_months: input.months || 3
        });
        return data;
      }
      case "get_price_changes": {
        const { data } = await supabase.rpc("ai_get_price_changes", {
          p_company_id: companyId
        });
        return data;
      }
      case "get_payment_analysis": {
        const { data } = await supabase.rpc("ai_get_payment_analysis", {
          p_company_id: companyId
        });
        return data;
      }
      case "get_month_comparison": {
        const params: any = { p_company_id: companyId };
        if (input.month1) params.p_month1 = input.month1;
        if (input.month2) params.p_month2 = input.month2;
        const { data } = await supabase.rpc("ai_get_month_comparison", params);
        return data;
      }
      case "get_expense_categories": {
        const params: any = { p_company_id: companyId };
        if (input.from_date) params.p_from_date = input.from_date;
        if (input.to_date) params.p_to_date = input.to_date;
        const { data } = await supabase.rpc("get_expense_category_breakdown", params);
        return data;
      }
      case "get_business_overview": {
        const { data } = await supabase.rpc("get_ai_insight_data", {
          p_company_id: companyId
        });
        return data;
      }
      default:
        return { error: "Unknown tool" };
    }
  } catch (err) {
    console.error(`Tool ${toolName} error:`, err);
    return { error: err.message };
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const { company_id, question } = await req.json();
    if (!company_id) return errorResponse("Missing company_id", 400);

    const userMessage = question 
      ? question 
      : "Generate a complete business analysis with health score, insights, risks, and weekly actions. Call get_business_overview first.";

    // Start conversation with Claude
    let messages: any[] = [{ role: "user", content: userMessage }];
    let finalResponse: any = null;
    let iterations = 0;
    const maxIterations = 5; // Safety limit for tool call loops

    while (iterations < maxIterations) {
      iterations++;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4096,
          system: SYSTEM_PROMPT,
          tools: TOOLS,
          messages: messages,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Claude error (${response.status}): ${errText}`);
      }

      const data = await response.json();

      // Check if Claude wants to use tools
      const toolUseBlocks = data.content.filter((b: any) => b.type === "tool_use");
      const textBlocks = data.content.filter((b: any) => b.type === "text");

      if (toolUseBlocks.length === 0) {
        // No more tool calls — this is the final answer
        const text = textBlocks.map((b: any) => b.text).join("");
        const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          finalResponse = JSON.parse(jsonMatch[0]);
        } else {
          finalResponse = { answer: text, confidence: "medium", data_points: [], follow_up: "" };
        }
        break;
      }

      // Execute all tool calls
      messages.push({ role: "assistant", content: data.content });

      const toolResults: any[] = [];
      for (const toolCall of toolUseBlocks) {
        console.log(`Executing tool: ${toolCall.name}`, toolCall.input);
        const result = await executeTool(toolCall.name, toolCall.input, company_id);
        toolResults.push({
          type: "tool_result",
          tool_use_id: toolCall.id,
          content: JSON.stringify(result),
        });
      }

      messages.push({ role: "user", content: toolResults });
    }

    if (!finalResponse) {
      finalResponse = { answer: "Analysis could not be completed", confidence: "low" };
    }

    return new Response(
      JSON.stringify({ success: true, insights: finalResponse, generated_at: new Date().toISOString() }),
      { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  } catch (error) {
    console.error("Insight error:", error);
    return errorResponse(error.message, 500);
  }
});

function errorResponse(message: string, status: number) {
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
  );
}