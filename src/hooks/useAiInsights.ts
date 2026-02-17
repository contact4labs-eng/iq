import { useState, useEffect, useCallback } from "react";
import { SUPABASE_URL } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export interface AiInsight {
  title: string;
  description: string;
  impact: string; // HIGH | MEDIUM | LOW
}

export interface AiRiskFlag {
  title: string;
  description: string;
}

export interface AiAction {
  text: string;
  done?: boolean;
}

export interface FullAnalysisResponse {
  health_score: number;
  insights: AiInsight[];
  weekly_actions: AiAction[];
  risk_flags: AiRiskFlag[];
}

export interface QaMessage {
  role: "user" | "assistant";
  content: string;
}

const EDGE_URL = `${SUPABASE_URL}/functions/v1/dynamic-task`;

export function useAiInsights() {
  const { company, session } = useAuth();
  const companyId = company?.id;
  const token = session?.access_token;

  const [analysis, setAnalysis] = useState<FullAnalysisResponse | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const [qaMessages, setQaMessages] = useState<QaMessage[]>([]);
  const [qaLoading, setQaLoading] = useState(false);

  const fetchAnalysis = useCallback(async () => {
    if (!companyId || !token) return;
    setAnalysisLoading(true);
    setAnalysisError(null);
    try {
      const res = await fetch(EDGE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ company_id: companyId, mode: "full_analysis" }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setAnalysis(data as FullAnalysisResponse);
    } catch (err: unknown) {
      setAnalysisError(err instanceof Error ? err.message : "Σφάλμα ανάλυσης AI");
    } finally {
      setAnalysisLoading(false);
    }
  }, [companyId, token]);

  useEffect(() => {
    fetchAnalysis();
  }, [fetchAnalysis]);

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
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const answer = data.answer ?? data.response ?? JSON.stringify(data);
      setQaMessages((prev) => [...prev, { role: "assistant", content: answer }]);
    } catch {
      setQaMessages((prev) => [...prev, { role: "assistant", content: "Σφάλμα — δοκιμάστε ξανά." }]);
    } finally {
      setQaLoading(false);
    }
  }, [companyId, token]);

  return { analysis, analysisLoading, analysisError, fetchAnalysis, qaMessages, qaLoading, askQuestion };
}
