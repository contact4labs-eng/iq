import { useState, useCallback } from "react";
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

const FALLBACK_ANSWER = "Δεν μπόρεσα να κατανοήσω την ερώτησή σας. Παρακαλώ δοκιμάστε μια ερώτηση σχετικά με τα οικονομικά σας δεδομένα, όπως έξοδα, έσοδα, τιμολόγια ή προμηθευτές.";

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

  const askQuestion = useCallback(async (question: string) => {
    if (!companyId || !token) return;
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
      });

      if (!res.ok) {
        throw new Error(
          res.status >= 500
            ? "Πρόβλημα σύνδεσης. Ελέγξτε τη σύνδεσή σας."
            : "Προέκυψε σφάλμα κατά την επεξεργασία. Παρακαλώ δοκιμάστε ξανά."
        );
      }

      let data: unknown;
      try {
        data = await res.json();
      } catch {
        throw new Error("Προέκυψε σφάλμα κατά την επεξεργασία. Παρακαλώ δοκιμάστε ξανά.");
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
      const msg =
        err instanceof Error && (err.message.startsWith("Πρόβλημα") || err.message.startsWith("Προέκυψε"))
          ? err.message
          : "Προέκυψε σφάλμα κατά την επεξεργασία. Παρακαλώ δοκιμάστε ξανά.";
      setQaMessages((prev) => [...prev, { role: "assistant", content: msg }]);
    } finally {
      setQaLoading(false);
    }
  }, [companyId, token]);

  return { qaMessages, qaLoading, askQuestion };
}
