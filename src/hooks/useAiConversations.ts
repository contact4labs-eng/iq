import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface AiConversation {
  id: string;
  company_id: string;
  user_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
  metadata: Record<string, unknown>;
}

export interface AiMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  tool_calls: Array<{ name: string; input: Record<string, unknown> }> | null;
  attachments: unknown[] | null;
  created_at: string;
}

/* ------------------------------------------------------------------ */
/*  Hook: manage conversation list                                      */
/* ------------------------------------------------------------------ */

export function useAiConversations() {
  const { user, company } = useAuth();
  const queryClient = useQueryClient();
  const companyId = company?.id;
  const userId = user?.id;

  // Fetch conversation list
  const {
    data: conversations = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["ai-conversations", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("ai_conversations")
        .select("*")
        .eq("company_id", companyId)
        .eq("is_archived", false)
        .order("updated_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as AiConversation[];
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Create a new conversation
  const createConversation = useCallback(async (title?: string): Promise<string | null> => {
    if (!companyId || !userId) return null;

    const { data, error } = await supabase
      .from("ai_conversations")
      .insert({
        company_id: companyId,
        user_id: userId,
        title: title || null,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Failed to create conversation:", error);
      return null;
    }

    queryClient.invalidateQueries({ queryKey: ["ai-conversations", companyId] });
    return data.id;
  }, [companyId, userId, queryClient]);

  // Update conversation title
  const updateTitle = useCallback(async (conversationId: string, title: string) => {
    await supabase
      .from("ai_conversations")
      .update({ title })
      .eq("id", conversationId);

    queryClient.invalidateQueries({ queryKey: ["ai-conversations", companyId] });
  }, [companyId, queryClient]);

  // Delete (archive) a conversation
  const archiveConversation = useCallback(async (conversationId: string) => {
    await supabase
      .from("ai_conversations")
      .update({ is_archived: true })
      .eq("id", conversationId);

    queryClient.invalidateQueries({ queryKey: ["ai-conversations", companyId] });
  }, [companyId, queryClient]);

  // Fetch messages for a conversation
  const fetchMessages = useCallback(async (conversationId: string): Promise<AiMessage[]> => {
    const { data, error } = await supabase
      .from("ai_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Failed to fetch messages:", error);
      return [];
    }

    return data as AiMessage[];
  }, []);

  // Save a message to a conversation
  const saveMessage = useCallback(async (
    conversationId: string,
    role: "user" | "assistant",
    content: string,
    toolCalls?: Array<{ name: string; input: Record<string, unknown> }> | null,
  ) => {
    const { error } = await supabase
      .from("ai_messages")
      .insert({
        conversation_id: conversationId,
        role,
        content,
        tool_calls: toolCalls || null,
      });

    if (error) {
      console.error("Failed to save message:", error);
    }
  }, []);

  return {
    conversations,
    isLoading,
    error,
    createConversation,
    updateTitle,
    archiveConversation,
    fetchMessages,
    saveMessage,
  };
}
