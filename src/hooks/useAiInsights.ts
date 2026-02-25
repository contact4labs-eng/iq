import { useState, useCallback, useRef, useEffect } from "react";
import { SUPABASE_URL } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAiConversations, type AiMessage } from "./useAiConversations";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface QaMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  toolCalls?: Array<{ name: string; input: Record<string, unknown> }>;
}

export interface ToolCallInfo {
  name: string;
  input: Record<string, unknown>;
}

const AI_CHAT_URL = `${SUPABASE_URL}/functions/v1/ai-chat`;
const MIN_INTERVAL_MS = 800;

/* ------------------------------------------------------------------ */
/*  SSE stream parser (enhanced with tool call events)                  */
/* ------------------------------------------------------------------ */

interface StreamEvent {
  type: "text" | "tool_calls" | "done";
  text?: string;
  tools?: ToolCallInfo[];
}

async function* parseSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>
): AsyncGenerator<StreamEvent> {
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    let currentEvent = "";

    for (const line of lines) {
      if (line.startsWith("event: ")) {
        currentEvent = line.slice(7).trim();
        continue;
      }

      if (line.startsWith("data: ")) {
        const data = line.slice(6).trim();
        if (data === "[DONE]") {
          yield { type: "done" };
          return;
        }

        try {
          const parsed = JSON.parse(data);

          // Handle tool call events
          if (currentEvent === "tool_calls" && parsed.tools) {
            yield { type: "tool_calls", tools: parsed.tools };
            currentEvent = "";
            continue;
          }

          // Handle message stop
          if (currentEvent === "message_stop" || parsed.type === "message_stop") {
            yield { type: "done" };
            return;
          }

          // Handle content deltas (streaming text)
          if (parsed.type === "content_block_delta" && parsed.delta?.text) {
            yield { type: "text", text: parsed.delta.text };
          }
        } catch {
          // Skip malformed JSON
        }
        currentEvent = "";
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

export function useAiInsights() {
  const { company, session } = useAuth();
  const { language } = useLanguage();
  const companyId = company?.id;
  const token = session?.access_token;

  const {
    conversations,
    isLoading: conversationsLoading,
    createConversation,
    updateTitle,
    archiveConversation,
    fetchMessages,
    saveMessage,
  } = useAiConversations();

  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [qaMessages, setQaMessages] = useState<QaMessage[]>([]);
  const [qaLoading, setQaLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [activeToolCalls, setActiveToolCalls] = useState<ToolCallInfo[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const lastSentRef = useRef<number>(0);

  // Load messages when switching conversations
  const loadConversation = useCallback(async (conversationId: string) => {
    setActiveConversationId(conversationId);
    const messages = await fetchMessages(conversationId);
    setQaMessages(
      messages.map((m: AiMessage) => ({
        role: m.role,
        content: m.content,
        timestamp: new Date(m.created_at).getTime(),
        toolCalls: m.tool_calls || undefined,
      }))
    );
  }, [fetchMessages]);

  // Start a new conversation
  const newConversation = useCallback(() => {
    abortRef.current?.abort();
    setActiveConversationId(null);
    setQaMessages([]);
    setStreamingText("");
    setActiveToolCalls([]);
    setQaLoading(false);
  }, []);

  const clearChat = newConversation;

  const stopGeneration = useCallback(() => {
    abortRef.current?.abort();
    setQaLoading(false);
    setActiveToolCalls([]);
  }, []);

  const deleteConversation = useCallback(async (conversationId: string) => {
    await archiveConversation(conversationId);
    if (activeConversationId === conversationId) {
      newConversation();
    }
  }, [archiveConversation, activeConversationId, newConversation]);

  const askQuestion = useCallback(async (question: string) => {
    if (!companyId || !token) return;

    const now = Date.now();
    if (now - lastSentRef.current < MIN_INTERVAL_MS) return;
    lastSentRef.current = now;

    // Cancel any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const userMsg: QaMessage = { role: "user", content: question, timestamp: Date.now() };
    setQaMessages((prev) => [...prev, userMsg]);
    setQaLoading(true);
    setStreamingText("");
    setActiveToolCalls([]);

    // Create or reuse conversation
    let convId = activeConversationId;
    if (!convId) {
      // Auto-generate title from first message (first 60 chars)
      const title = question.length > 60 ? question.slice(0, 57) + "..." : question;
      convId = await createConversation(title);
      if (convId) {
        setActiveConversationId(convId);
      }
    }

    // Save user message to DB
    if (convId) {
      saveMessage(convId, "user", question);
    }

    // Build conversation history for the API (last 40 messages for richer context)
    const prevMessages = [...qaMessages, userMsg].slice(-40);
    const apiMessages = prevMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const res = await fetch(AI_CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          company_id: companyId,
          messages: apiMessages,
          language: language,
        }),
        signal: controller.signal,
      });

      if (res.ok && res.headers.get("content-type")?.includes("text/event-stream")) {
        const reader = res.body!.getReader();
        let fullText = "";
        let toolCalls: ToolCallInfo[] = [];

        for await (const event of parseSSEStream(reader)) {
          if (controller.signal.aborted) break;

          if (event.type === "tool_calls" && event.tools) {
            toolCalls = event.tools;
            setActiveToolCalls(event.tools);
          } else if (event.type === "text" && event.text) {
            fullText += event.text;
            setStreamingText(fullText);
          } else if (event.type === "done") {
            break;
          }
        }

        if (!controller.signal.aborted && fullText.trim()) {
          const assistantMsg: QaMessage = {
            role: "assistant",
            content: fullText,
            timestamp: Date.now(),
            toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
          };
          setQaMessages((prev) => [...prev, assistantMsg]);

          // Save assistant message to DB
          if (convId) {
            saveMessage(convId, "assistant", fullText, toolCalls.length > 0 ? toolCalls : null);
          }

          // Auto-update conversation title if it's the first exchange
          if (convId && qaMessages.length === 0 && fullText.length > 20) {
            // Use first line of response as a better title (if it's short enough)
            const firstLine = fullText.split("\n")[0].replace(/[#*]/g, "").trim();
            if (firstLine.length > 5 && firstLine.length < 80) {
              // Keep original user question as title — it's more descriptive
            }
          }
        }
        setStreamingText("");
        setActiveToolCalls([]);
      } else if (res.ok) {
        // Non-streaming JSON response
        const data = await res.json();
        const answer = (data as any)?.content?.[0]?.text ||
          (data as any)?.answer ||
          "I couldn't process that request. Please try again.";
        const assistantMsg: QaMessage = { role: "assistant", content: answer, timestamp: Date.now() };
        setQaMessages((prev) => [...prev, assistantMsg]);
        if (convId) {
          saveMessage(convId, "assistant", answer);
        }
      } else {
        throw new Error(`Service error (${res.status})`);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      const msg = err instanceof Error ? err.message : "An error occurred";
      setQaMessages((prev) => [
        ...prev,
        { role: "assistant", content: `⚠️ ${msg}`, timestamp: Date.now() },
      ]);
    } finally {
      setQaLoading(false);
      setStreamingText("");
      setActiveToolCalls([]);
    }
  }, [companyId, token, qaMessages, language, activeConversationId, createConversation, saveMessage]);

  return {
    // Chat state
    qaMessages,
    qaLoading,
    streamingText,
    activeToolCalls,
    // Actions
    askQuestion,
    clearChat,
    stopGeneration,
    // Conversation management
    conversations,
    conversationsLoading,
    activeConversationId,
    loadConversation,
    newConversation,
    deleteConversation,
  };
}
