import { useState, useCallback, useRef } from "react";
import { SUPABASE_URL } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export interface DataPoint {
  label: string;
  value: string | number;
}

export interface ParsedResponse {
  answer: string;
  data_points?: DataPoint[];
  follow_up?: string;
}

export interface QaMessage {
  role: "user" | "assistant";
  content: string;
  data_points?: DataPoint[];
  follow_up?: string;
}

const EDGE_URL = `${SUPABASE_URL}/functions/v1/dynamic-task`;

const FALLBACK_ANSWER = "ÎÎµÎ½ Î¼ÏÏÏÎµÏÎ± Î½Î± ÎºÎ±ÏÎ±Î½Î¿Î®ÏÏ ÏÎ·Î½ ÎµÏÏÏÎ·ÏÎ® ÏÎ±Ï. Î Î±ÏÎ±ÎºÎ±Î»Ï Î´Î¿ÎºÎ¹Î¼Î¬ÏÏÎµ Î¼Î¹Î± ÎµÏÏÏÎ·ÏÎ· ÏÏÎµÏÎ¹ÎºÎ¬ Î¼Îµ ÏÎ± Î¿Î¹ÎºÎ¿Î½Î¿Î¼Î¹ÎºÎ¬ ÏÎ±Ï Î´ÎµÎ´Î¿Î¼Î­Î½Î±, ÏÏÏÏ Î­Î¾Î¿Î´Î±, Î­ÏÎ¿Î´Î±, ÏÎ¹Î¼Î¿Î»ÏÎ³Î¹Î± Î® ÏÏÎ¿Î¼Î·Î¸ÎµÏÏÎ­Ï.";

function extractAnswer(obj: Record<string, unknown>): string | null {
  // Try nested insights.answer
  if (obj.insights && typeof obj.insights === "object") {
    const ins = obj.insights as Record<string, unknown>;
    if (typeof ins.answer === "string" && ins.answer.trim()) return ins.answer;
  }
  // Try top-level answer
  if (typeof obj.answer === "string" && obj.answer.trim()) return obj.answer;
  // Try response
  if (typeof obj.response === "string" && obj.response.trim()) return obj.response;
  // Try message
  if (typeof obj.message === "string" && obj.message.trim()) return obj.message;
  return null;
}

function extractDataPoints(obj: Record<string, unknown>): DataPoint[] | undefined {
  const src = (obj.insights && typeof obj.insights === "object")
    ? (obj.insights as Record<string, unknown>)
    : obj;
  return Array.isArray(src.data_points) && src.data_points.length > 0
    ? src.data_points
    : undefined;
}

function extractFollowUp(obj: Record<string, unknown>): string | undefined {
  const src = (obj.insights && typeof obj.insights === "object")
    ? (obj.insights as Record<string, unknown>)
    : obj;
  const fu = src.follow_up;
  return (typeof fu === "string" && fu.trim()) ? fu : undefined;
}

function parseEdgeResponse(data: unknown): ParsedResponse {
  if (!data || typeof data !== "object") {
    return { answer: FALLBACK_ANSWER };
  }

  const obj = data as Record<string, unknown>;
  const answer = extractAnswer(obj);

  if (!answer) {
    return { answer: FALLBACK_ANSWER };
  }

  return {
    answer,
    data_points: extractDataPoints(obj),
    follow_up: extractFollowUp(obj),
  };
}

export function useAiInsights() {
  const { company, session } = useAuth();
  const companyId = company?.id;
  const token = session?.access_token;

  const [qaMessages, setQaMessages] = useState<QaMessage[]>([]);
  const [qaLoading, setQaLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const askQuestion = useCallback(async (question: string) => {
    if (!companyId || !token) return;
    // Cancel any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setQaMessages((prev) => [...prev, { role: "user", content: question }]);
    setQaLoading(true);
    try {
      const res = await fetch(EDGE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ company_id: companyId, mode: "qa", question }),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(
          res.status >= 500
            ? "Î ÏÏÎ²Î»Î·Î¼Î± ÏÏÎ½Î´ÎµÏÎ·Ï. ÎÎ»Î­Î³Î¾ÏÎµ ÏÎ· ÏÏÎ½Î´ÎµÏÎ® ÏÎ±Ï."
            : "Î ÏÎ¿Î­ÎºÏÏÎµ ÏÏÎ¬Î»Î¼Î± ÎºÎ±ÏÎ¬ ÏÎ·Î½ ÎµÏÎµÎ¾ÎµÏÎ³Î±ÏÎ¯Î±. Î Î±ÏÎ±ÎºÎ±Î»Ï Î´Î¿ÎºÎ¹Î¼Î¬ÏÏÎµ Î¾Î±Î½Î¬."
        );
      }

      let data: unknown;
      try {
        data = await res.json();
      } catch {
        throw new Error("Î ÏÎ¿Î­ÎºÏÏÎµ ÏÏÎ¬Î»Î¼Î± ÎºÎ±ÏÎ¬ ÏÎ·Î½ ÎµÏÎµÎ¾ÎµÏÎ³Î±ÏÎ¯Î±. Î Î±ÏÎ±ÎºÎ±Î»Ï Î´Î¿ÎºÎ¹Î¼Î¬ÏÏÎµ Î¾Î±Î½Î¬.");
      }

      const parsed = parseEdgeResponse(data);

      setQaMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: parsed.answer,
          data_points: parsed.data_points,
          follow_up: parsed.follow_up,
        },
      ]);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      const msg =
        err instanceof Error && (err.message.startsWith("\u03A0\u03C1\u03CC\u03B2\u03BB\u03B7\u03BC\u03B1") || err.message.startsWith("\u03A0\u03C1\u03BF\u03AD\u03BA\u03C5\u03C8\u03B5"))
          ? err.message
          : "\u03A0\u03C1\u03BF\u03AD\u03BA\u03C5\u03C8\u03B5 \u03C3\u03C6\u03AC\u03BB\u03BC\u03B1 \u03BA\u03B1\u03C4\u03AC \u03C4\u03B7\u03BD \u03B5\u03C0\u03B5\u03BE\u03B5\u03C1\u03B3\u03B1\u03C3\u03AF\u03B1. \u03A0\u03B1\u03C1\u03B1\u03BA\u03B1\u03BB\u03CE \u03B4\u03BF\u03BA\u03B9\u03BC\u03AC\u03C3\u03C4\u03B5 \u03BE\u03B1\u03BD\u03AC.";
      setQaMessages((prev) => [...prev, { role: "assistant", content: msg }]);
    } finally {
      setQaLoading(false);
    }
  }, [companyId, token]);

  return { qaMessages, qaLoading, askQuestion };
}
