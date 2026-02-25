import { Plus, MessageSquare, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import type { AiConversation } from "@/hooks/useAiConversations";

interface ConversationSidebarProps {
  conversations: AiConversation[];
  activeId: string | null;
  loading: boolean;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

export function ConversationSidebar({
  conversations,
  activeId,
  loading,
  onSelect,
  onNew,
  onDelete,
}: ConversationSidebarProps) {
  const { t } = useLanguage();

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);

    if (diffDays === 0) return date.toLocaleTimeString("el-GR", { hour: "2-digit", minute: "2-digit" });
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return date.toLocaleDateString("el-GR", { weekday: "short" });
    return date.toLocaleDateString("el-GR", { day: "2-digit", month: "2-digit" });
  };

  return (
    <div className="flex flex-col h-full border-r border-border bg-muted/30">
      {/* Header + New chat button */}
      <div className="p-3 border-b border-border">
        <Button
          onClick={onNew}
          variant="outline"
          size="sm"
          className="w-full gap-2 justify-start text-sm"
        >
          <Plus className="w-4 h-4" />
          {t("ai.new_chat")}
        </Button>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : conversations.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8 px-3">
            {t("ai.no_conversations")}
          </p>
        ) : (
          <div className="py-1">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={cn(
                  "group flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-muted/60 transition-colors",
                  activeId === conv.id && "bg-muted"
                )}
                onClick={() => onSelect(conv.id)}
              >
                <MessageSquare className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate text-foreground">
                    {conv.title || "Untitled"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatDate(conv.updated_at)}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(conv.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-all"
                  title={t("ai.delete_conversation")}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-border">
        <p className="text-[10px] text-muted-foreground text-center">
          {conversations.length} {t("ai.conversations")}
        </p>
      </div>
    </div>
  );
}
