import { useState, useCallback, useRef } from "react";
import { SUPABASE_URL } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

export interface QaMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

const AI_CHAT_URL = `${SUPABASE_URL}/functions/v1/ai-chat`;
const LEGACY_URL = `${SUPABASE_URL}/functions/v1/dynamic-task`;
const MIN_INTERVAL_MS = 800;

/* ------------------------------------------------------------------ */
/*  SSE stream parser                                                   */
/* ------------------------------------------------------------------ */

async function* parseSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>
): AsyncGenerator<string> {
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6).trim();
        if (data === "[DONE]") return;
        try {
          const parsed = JSON.parse(data);
          // Anthropic streaming format
          if (parsed.type === "content_block_delta" && parsed.delta?.text) {
            yield parsed.delta.text;
          }
        } catch {
          // Skip malformed JSON
        }
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Legacy (non-streaming) fallback                                     */
/* ------------------------------------------------------------------ */

function extractAnswer(obj: Record<string, unknown>): string | null {
  if (obj.insights && typeof obj.insights === "object") {
    const ins = obj.insights as Record<string, unknown>;
    if (typeof ins.answer === "string" && ins.answer.trim()) return ins.answer;
  }
  if (typeof obj.answer === "string" && obj.answer.trim()) return obj.answer;
  if (typeof obj.response === "string" && obj.response.trim()) return obj.response;
  if (typeof obj.message === "string" && obj.message.trim()) return obj.message;
  return null;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

export function useAiInsights() {
  const { company, session } = useAuth();
  const { language } = useLanguage();
  const companyId = company?.id;
  const token = session?.access_token;

  const [qaMessages, setQaMessages] = useState<QaMessage[]>([]);
  const [qaLoading, setQaLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const lastSentRef = useRef<number>(0);

  const clearChat = useCallback(() => {
    abortRef.current?.abort();
    setQaMessages([]);
    setStreamingText("");
    setQaLoading(false);
  }, []);

  const stopGeneration = useCallback(() => {
    abortRef.current?.abort();
    setQaLoading(false);
  }, []);

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

    // Build conversation history for the API (last 20 messages)
    const prevMessages = [...qaMessages, userMsg].slice(-20);
    const apiMessages = prevMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      // Try new streaming endpoint first
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
        // Streaming response
        const reader = res.body!.getReader();
        let fullText = "";

        for await (const chunk of parseSSEStream(reader)) {
          if (controller.signal.aborted) break;
          fullText += chunk;
          setStreamingText(fullText);
        }

        if (!controller.signal.aborted && fullText.trim()) {
          setQaMessages((prev) => [
            ...prev,
            { role: "assistant", content: fullText, timestamp: Date.now() },
          ]);
        }
        setStreamingText("");
      } else if (res.ok) {
        // Non-streaming JSON response (new endpoint returned JSON)
        const data = await res.json();
        const answer = extractAnswer(data as Record<string, unknown>) ||
          (data as any)?.content?.[0]?.text ||
          "I couldn't process that request. Please try again.";
        setQaMessages((prev) => [
          ...prev,
          { role: "assistant", content: answer, timestamp: Date.now() },
        ]);
      } else {
        // New endpoint failed, try legacy fallback
        console.warn("ai-chat returned", res.status, "— falling back to legacy");
        const legacyRes = await fetch(LEGACY_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ company_id: companyId, mode: "qa", question }),
          signal: controller.signal,
        });

        if (!legacyRes.ok) throw new Error("Service unavailable");

        const data = await legacyRes.json();
        const answer = extractAnswer(data as Record<string, unknown>) ||
          "I couldn't process that request. Please try again.";
        setQaMessages((prev) => [
          ...prev,
          { role: "assistant", content: answer, timestamp: Date.now() },
        ]);
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
    }
  }, [companyId, token, qaMessages, language]);

  return { qaMessages, qaLoading, streamingText, askQuestion, clearChat, stopGeneration };
}
