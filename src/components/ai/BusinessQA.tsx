import { useState, useRef, useEffect, useCallback } from "react";
import type { QaMessage } from "@/hooks/useAiInsights";
import { Button } from "@/components/ui/button";
import { Send, Bot, User, Copy, Check, RotateCcw, Square, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { useLanguage } from "@/contexts/LanguageContext";
import type { TranslationKey } from "@/contexts/LanguageContext";

/* ------------------------------------------------------------------ */
/*  Suggestion categories                                               */
/* ------------------------------------------------------------------ */

interface SuggestionCategory {
  labelKey: TranslationKey;
  icon: string;
  keys: TranslationKey[];
}

const SUGGESTION_CATEGORIES: SuggestionCategory[] = [
  {
    labelKey: "ai.cat_financial",
    icon: "💰",
    keys: ["ai.suggestion_2", "ai.suggestion_5"],
  },
  {
    labelKey: "ai.cat_suppliers",
    icon: "🏪",
    keys: ["ai.suggestion_3", "ai.suggestion_1"],
  },
  {
    labelKey: "ai.cat_invoices",
    icon: "📄",
    keys: ["ai.suggestion_4", "ai.suggestion_6"],
  },
];

/* ------------------------------------------------------------------ */
/*  Sub-components                                                      */
/* ------------------------------------------------------------------ */

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-1 py-1">
      <div className="flex gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-accent/60 animate-bounce [animation-delay:0ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-accent/60 animate-bounce [animation-delay:150ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-accent/60 animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted-foreground/10"
      title="Copy"
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-green-500" />
      ) : (
        <Copy className="w-3.5 h-3.5 text-muted-foreground" />
      )}
    </button>
  );
}

function MessageTimestamp({ timestamp }: { timestamp: number }) {
  const d = new Date(timestamp);
  const time = d.toLocaleTimeString("el-GR", { hour: "2-digit", minute: "2-digit" });
  return <span className="text-[10px] text-muted-foreground/60">{time}</span>;
}

function AutoResizeTextarea({
  value,
  onChange,
  onSubmit,
  disabled,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled: boolean;
  placeholder: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = "auto";
      ref.current.style.height = Math.min(ref.current.scrollHeight, 160) + "px";
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      placeholder={placeholder}
      rows={1}
      className="flex-1 resize-none rounded-xl border border-input bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 scrollbar-thin"
      style={{ minHeight: "42px", maxHeight: "160px" }}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                      */
/* ------------------------------------------------------------------ */

interface BusinessQAProps {
  messages: QaMessage[];
  loading: boolean;
  streamingText: string;
  onAsk: (q: string) => void;
  onClearChat: () => void;
  onStopGeneration: () => void;
}

export function BusinessQA({ messages, loading, streamingText, onAsk, onClearChat, onStopGeneration }: BusinessQAProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();

  // Auto-scroll on new content
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, streamingText, scrollToBottom]);

  const submit = () => {
    const q = input.trim();
    if (!q || loading) return;
    setInput("");
    onAsk(q);
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
          {/* Empty state / Welcome */}
          {isEmpty && !loading && (
            <div className="flex flex-col items-center gap-6 pt-8 animate-fade-in">
              <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center">
                <Sparkles className="w-7 h-7 text-accent" />
              </div>
              <div className="text-center space-y-2">
                <h2 className="text-lg font-semibold text-foreground">
                  {t("ai.welcome_title")}
                </h2>
                <p className="text-sm text-muted-foreground max-w-md">
                  {t("ai.welcome")}
                </p>
              </div>

              {/* Categorized suggestions */}
              <div className="w-full max-w-lg grid gap-3 mt-2">
                {SUGGESTION_CATEGORIES.map((cat) => (
                  <div key={cat.labelKey} className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 px-1">
                      <span>{cat.icon}</span>
                      {t(cat.labelKey)}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {cat.keys.map((key) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => onAsk(t(key))}
                          disabled={loading}
                          className="text-left px-3 py-2.5 rounded-xl text-sm border border-border bg-card text-muted-foreground hover:border-accent/50 hover:text-foreground hover:bg-accent/5 transition-all disabled:opacity-50"
                        >
                          {t(key)}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Message list */}
          {messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                "flex gap-3 animate-fade-in group",
                m.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {m.role === "assistant" && (
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4 text-accent" />
                </div>
              )}
              <div className="max-w-[85%] space-y-1">
                <div
                  className={cn(
                    "rounded-2xl px-4 py-3 text-sm",
                    m.role === "user"
                      ? "bg-accent text-accent-foreground rounded-br-md"
                      : "bg-muted text-foreground rounded-bl-md"
                  )}
                >
                  {m.role === "assistant" ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-2 [&>p:last-child]:mb-0 [&>ul]:mb-2 [&>ol]:mb-2 [&>table]:mb-2 [&>h1]:text-base [&>h2]:text-sm [&>h3]:text-sm [&>blockquote]:border-accent/30">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  )}
                </div>
                <div className={cn(
                  "flex items-center gap-2 px-1",
                  m.role === "user" ? "justify-end" : "justify-start"
                )}>
                  <MessageTimestamp timestamp={m.timestamp} />
                  {m.role === "assistant" && <CopyButton text={m.content} />}
                </div>
              </div>
              {m.role === "user" && (
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4 text-primary" />
                </div>
              )}
            </div>
          ))}

          {/* Streaming response */}
          {streamingText && (
            <div className="flex gap-3 justify-start animate-fade-in">
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-4 h-4 text-accent" />
              </div>
              <div className="max-w-[85%]">
                <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3 text-sm">
                  <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-2 [&>p:last-child]:mb-0 [&>ul]:mb-2 [&>ol]:mb-2 [&>table]:mb-2 [&>h1]:text-base [&>h2]:text-sm [&>h3]:text-sm [&>blockquote]:border-accent/30">
                    <ReactMarkdown>{streamingText}</ReactMarkdown>
                    <span className="inline-block w-0.5 h-4 bg-accent/70 animate-pulse ml-0.5 align-text-bottom" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Loading indicator (no streaming yet) */}
          {loading && !streamingText && (
            <div className="flex gap-3 justify-start animate-fade-in">
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-accent" />
              </div>
              <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-2.5">
                <TypingIndicator />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input bar */}
      <div className="border-t border-border bg-card/80 backdrop-blur-sm px-4 py-3">
        <div className="max-w-3xl mx-auto space-y-2">
          {/* Action buttons row */}
          {messages.length > 0 && (
            <div className="flex items-center gap-2 justify-center">
              {loading ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs h-7"
                  onClick={onStopGeneration}
                >
                  <Square className="w-3 h-3" />
                  {t("ai.stop")}
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-xs h-7 text-muted-foreground"
                  onClick={onClearChat}
                >
                  <RotateCcw className="w-3 h-3" />
                  {t("ai.new_chat")}
                </Button>
              )}
            </div>
          )}

          {/* Input row */}
          <div className="flex gap-2 items-end">
            <AutoResizeTextarea
              value={input}
              onChange={setInput}
              onSubmit={submit}
              disabled={loading}
              placeholder={t("ai.placeholder")}
            />
            <Button
              size="icon"
              onClick={submit}
              disabled={loading || !input.trim()}
              className="rounded-xl shrink-0 h-[42px] w-[42px]"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>

          <p className="text-[10px] text-muted-foreground/50 text-center">
            {t("ai.disclaimer")}
          </p>
        </div>
      </div>
    </div>
  );
}
