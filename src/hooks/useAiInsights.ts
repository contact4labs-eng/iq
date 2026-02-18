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

function parseEdgeResponse(data: unknown): ParsedResponse {
  if (!data || typeof data !== "object") {
    return { answer: String(data) };
  }

  const obj = data as Record<string, unknown>;

  // Handle { insights: { answer, data_points, follow_up } }
  if (obj.insights && typeof obj.insights === "object") {
    const ins = obj.insights as Record<string, unknown>;
    return {
      answer: (ins.answer as string) ?? "",
      data_points: Array.isArray(ins.data_points) ? ins.data_points : undefined,
      follow_up: (ins.follow_up as string) ?? undefined,
    };
  }

  // Handle { answer: "..." } directly
  if (typeof obj.answer === "string") {
    return {
      answer: obj.answer,
      data_points: Array.isArray(obj.data_points) ? obj.data_points : undefined,
      follow_up: (obj.follow_up as string) ?? undefined,
    };
  }

  // Handle { response: "..." }
  if (typeof obj.response === "string") {
    return { answer: obj.response };
  }

  // Fallback — don't show raw JSON
  return { answer: "Δεν ήταν δυνατή η ανάλυση της απάντησης." };
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
            : "Δυστυχώς δεν μπόρεσα να απαντήσω. Δοκιμάστε ξανά ή διατυπώστε διαφορετικά."
        );
      }

      const data = await res.json();
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
        err instanceof Error && err.message.startsWith("Πρόβλημα")
          ? err.message
          : "Δυστυχώς δεν μπόρεσα να απαντήσω. Δοκιμάστε ξανά ή διατυπώστε διαφορετικά.";
      setQaMessages((prev) => [...prev, { role: "assistant", content: msg }]);
    } finally {
      setQaLoading(false);
    }
  }, [companyId, token]);

  return { qaMessages, qaLoading, askQuestion };
}
