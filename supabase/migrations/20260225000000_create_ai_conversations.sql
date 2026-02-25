-- Migration: Create AI conversation persistence tables
-- This enables the AI chat to save and restore conversation history

-- ============================================================
-- Table: ai_conversations (conversation threads)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_archived BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for fast lookup
CREATE INDEX idx_ai_conversations_company ON public.ai_conversations(company_id);
CREATE INDEX idx_ai_conversations_user ON public.ai_conversations(user_id);
CREATE INDEX idx_ai_conversations_updated ON public.ai_conversations(updated_at DESC);

-- ============================================================
-- Table: ai_messages (individual messages within conversations)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  tool_calls JSONB DEFAULT NULL,
  attachments JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fetching messages in order
CREATE INDEX idx_ai_messages_conversation ON public.ai_messages(conversation_id, created_at ASC);

-- ============================================================
-- RLS Policies
-- ============================================================
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

-- Conversations: users can only access their own conversations
CREATE POLICY "Users can view own conversations"
  ON public.ai_conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own conversations"
  ON public.ai_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations"
  ON public.ai_conversations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations"
  ON public.ai_conversations FOR DELETE
  USING (auth.uid() = user_id);

-- Messages: users can access messages in their conversations
CREATE POLICY "Users can view messages in own conversations"
  ON public.ai_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_conversations
      WHERE id = ai_messages.conversation_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages in own conversations"
  ON public.ai_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ai_conversations
      WHERE id = ai_messages.conversation_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete messages in own conversations"
  ON public.ai_messages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_conversations
      WHERE id = ai_messages.conversation_id
      AND user_id = auth.uid()
    )
  );

-- ============================================================
-- Trigger to auto-update updated_at on conversations
-- ============================================================
CREATE OR REPLACE FUNCTION update_ai_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.ai_conversations
  SET updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER ai_messages_update_conversation_timestamp
  AFTER INSERT ON public.ai_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_conversation_timestamp();
