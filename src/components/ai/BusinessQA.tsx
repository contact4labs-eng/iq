import { useState, useRef, useEffect } from "react";
import type { QaMessage } from "@/hooks/useAiInsights";
import { Button } from "@/components/ui/button";
import { Send, Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

const SUGGESTIONS = [
  "Ποια είναι τα top 5 έξοδά μου;",
  "Πώς πάει η επιχείρηση αυτόν τον μήνα;",
  "Ποιος προμηθευτής μου κοστίζει περισσότερο;",
  "Υπάρχουν ληξιπρόθεσμα τιμολόγια;",
  "Δώσε μου μια ανάλυση εσόδων-εξόδων",
  "Τι δείχνουν οι τάσεις του τελευταίου 6μηνου;",
];

interface BusinessQAProps {
  messages: QaMessage[];
  loading: boolean;
  onAsk: (q: string) => void;
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0ms]" />
      <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:150ms]" />
      <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:300ms]" />
    </div>
  );
}

function DataPointsTable({ points }: { points: { label: string; value: string | number }[] }) {
  return (
    <div className="mt-3 rounded-lg border border-border overflow-hidden">
      <table className="w-full text-sm">
        <tbody>
          {points.map((p, i) => (
            <tr key={i} className={cn("border-b border-border last:border-0", i % 2 === 0 ? "bg-muted/30" : "bg-background")}>
              <td className="px-3 py-2 font-medium text-foreground">{p.label}</td>
              <td className="px-3 py-2 text-right text-muted-foreground">{p.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function BusinessQA({ messages, loading, onAsk }: BusinessQAProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

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
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {isEmpty && (
          <div className="flex flex-col gap-4 animate-fade-in">
            {/* Welcome bubble */}
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-4 h-4 text-accent" />
              </div>
              <div className="max-w-[80%] rounded-2xl rounded-bl-md bg-muted text-foreground px-4 py-3 text-sm">
                Γεια σας! Είμαι ο AI βοηθός σας. Μπορώ να αναλύσω τα οικονομικά σας δεδομένα, να απαντήσω ερωτήσεις για τιμολόγια, προμηθευτές, έξοδα και έσοδα. Ρωτήστε με ό,τι θέλετε!
              </div>
            </div>
            {/* Suggestion chips */}
            <div className="flex flex-wrap gap-2 pl-11">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onAsk(s)}
                  disabled={loading}
                  className="px-3 py-1.5 rounded-full text-xs border border-border bg-card text-muted-foreground hover:border-accent/50 hover:text-foreground transition-colors disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={cn("flex gap-3 animate-fade-in", m.role === "user" ? "justify-end" : "justify-start")}>
            {m.role === "assistant" && (
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-4 h-4 text-accent" />
              </div>
            )}
            <div
              className={cn(
                "max-w-[80%] rounded-2xl px-4 py-3 text-sm",
                m.role === "user"
                  ? "bg-accent text-accent-foreground rounded-br-md"
                  : "bg-muted text-foreground rounded-bl-md"
              )}
            >
              {m.role === "assistant" ? (
                <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-2 [&>p:last-child]:mb-0 [&>ul]:mb-2 [&>ol]:mb-2">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              ) : (
                m.content
              )}
              {m.data_points && m.data_points.length > 0 && (
                <DataPointsTable points={m.data_points} />
              )}
            </div>
            {m.role === "user" && (
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-4 h-4 text-primary" />
              </div>
            )}
          </div>
        ))}

        {/* Follow-up chip from last assistant message */}
        {!loading && messages.length > 0 && messages[messages.length - 1].role === "assistant" && messages[messages.length - 1].follow_up && (
          <div className="flex justify-start pl-11 animate-fade-in">
            <button
              type="button"
              onClick={() => onAsk(messages[messages.length - 1].follow_up!)}
              className="px-3 py-1.5 rounded-full text-xs border border-accent/30 bg-accent/5 text-accent hover:bg-accent/10 transition-colors"
            >
              {messages[messages.length - 1].follow_up}
            </button>
          </div>
        )}

        {loading && (
          <div className="flex gap-3 justify-start animate-fade-in">
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-accent" />
            </div>
            <div className="bg-muted rounded-2xl rounded-bl-md">
              <TypingDots />
            </div>
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="border-t border-border bg-card px-4 py-3">
        <div className="flex gap-2 max-w-3xl mx-auto">
          <input
            ref={inputRef}
            type="text"
            placeholder="Ρωτήστε κάτι..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            disabled={loading}
            className="flex-1 h-10 rounded-xl border border-input bg-background px-4 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          />
          <Button size="icon" onClick={submit} disabled={loading || !input.trim()} className="rounded-xl shrink-0">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
