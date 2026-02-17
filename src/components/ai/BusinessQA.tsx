import { useState, useRef, useEffect } from "react";
import type { QaMessage } from "@/hooks/useAiInsights";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Loader2, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const CHIPS = [
  "Ποιος είναι ο μεγαλύτερος προμηθευτής μου;",
  "Πώς πάει η ρευστότητά μου;",
  "Ποιες τιμές αυξήθηκαν;",
  "Σύγκριση μήνα",
];

interface BusinessQAProps {
  messages: QaMessage[];
  loading: boolean;
  onAsk: (q: string) => void;
}

export function BusinessQA({ messages, loading, onAsk }: BusinessQAProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const submit = () => {
    const q = input.trim();
    if (!q || loading) return;
    setInput("");
    onAsk(q);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-accent" /> Ρωτήστε για την επιχείρησή σας
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Chips */}
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {CHIPS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onAsk(c)}
                disabled={loading}
                className="px-3 py-1.5 rounded-full text-xs border border-border bg-card text-muted-foreground hover:border-accent/50 transition-colors disabled:opacity-50"
              >
                {c}
              </button>
            ))}
          </div>
        )}

        {/* Messages */}
        {messages.length > 0 && (
          <div ref={scrollRef} className="max-h-80 overflow-y-auto space-y-3 pr-1">
            {messages.map((m, i) => (
              <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[85%] rounded-xl px-4 py-2.5 text-sm",
                    m.role === "user"
                      ? "bg-accent text-accent-foreground rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm"
                  )}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-xl px-4 py-2.5 rounded-bl-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Input */}
        <div className="flex gap-2">
          <Input
            placeholder="Ρωτήστε κάτι..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            disabled={loading}
          />
          <Button size="icon" onClick={submit} disabled={loading || !input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
