// supabase/functions/ai-chat/index.ts
// Deploy: supabase functions deploy ai-chat
// Required secret: ANTHROPIC_API_KEY (set via supabase secrets set ANTHROPIC_API_KEY=sk-ant-...)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { TOOL_DEFINITIONS, executeTool } from "./tools.ts";

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
/*  System prompt                                                       */
/* ------------------------------------------------------------------ */

function buildSystemPrompt(language: string): string {
  const lang = language === "el" ? "Greek" : "English";

  return `You are the AI financial analyst and business assistant for 4Labs, a business management platform for food & beverage companies. You help business owners understand their finances, suppliers, costs, products, and make better decisions.

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
- **Invoice management**: search, filter, track overdue, analyze payment cycles, update statuses
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

    const systemPrompt = buildSystemPrompt(language || "el");

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
