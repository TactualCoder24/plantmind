"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Send, FileText, Network, Loader2, ThumbsUp, ThumbsDown, Check, Bot } from "lucide-react";
import { useRole, ROLE_LABELS } from "@/lib/roleContext";
import { Citation } from "@/lib/types";
import { confidenceLabel, formatGraphFact, friendlyToolLabel } from "@/lib/labels";
import { ProposalCard } from "@/components/ProposalCard";

interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  question?: string;
  citations?: Citation[];
  graphFacts?: string[];
  confidence?: number;
  rated?: "up" | "down";
  agentic?: boolean;
  steps?: { step: number; tool: string; result?: unknown }[];
}

const SUGGESTED = [
  "Why did C-301 trip in July 2025, and had this happened before?",
  "Show me all maintenance history connected to CT-02.",
  "Is there a pattern of deferred maintenance leading to unplanned shutdowns?",
  "What's the compliance status of B-201?",
  "What caused the P-105 cavitation event?",
];

export default function ChatPage() {
  const { role } = useRole();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Skip on initial mount (no messages yet) — scrolling into view here has nothing useful to
    // do and can nudge the whole page by a few pixels, which looks like the header overlapping
    // the title on first load. Only scroll once there's an actual conversation to follow.
    if (messages.length === 0) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages]);

  async function ask(question: string) {
    if (!question.trim() || loading) return;
    const userMsg: Message = { id: crypto.randomUUID(), role: "user", text: question };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, role }),
      });
      const data = await res.json();
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: data.answer || "No answer returned.",
          question,
          citations: data.citations,
          graphFacts: data.graphFacts,
          confidence: data.confidence,
          agentic: data.agentic,
          steps: data.steps,
        },
      ]);
    } catch {
      setMessages((m) => [...m, { id: crypto.randomUUID(), role: "assistant", text: "Something went wrong reaching the copilot API." }]);
    } finally {
      setLoading(false);
    }
  }

  async function rate(msg: Message, rating: "up" | "down") {
    setMessages((m) => m.map((x) => (x.id === msg.id ? { ...x, rated: rating } : x)));
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: msg.question || "", answer: msg.text, rating, role }),
      });
    } catch {
      // Feedback is a nice-to-have — a failed save shouldn't interrupt the conversation.
    }
  }

  return (
    <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-56px)] md:h-[calc(100vh-57px)]">
      <div className="px-4 md:px-0 pt-4 pb-2">
        <h1 className="text-lg font-display font-semibold text-text">Ask a Question</h1>
        <p className="text-sm text-text-muted mt-1">
          Answering for: {ROLE_LABELS[role]}. It decides for itself which documents and records to
          check, and every answer shows exactly where it came from.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-0 space-y-4 pb-4">
        {messages.length === 0 && (
          <div className="space-y-2 pt-4">
            <p className="text-sm text-text-muted">Try asking:</p>
            <div className="flex flex-col gap-2">
              {SUGGESTED.map((q) => (
                <button
                  key={q}
                  onClick={() => ask(q)}
                  className="text-left text-sm bg-surface border border-border hover:border-accent/60 rounded-lg px-3 py-2 text-text-secondary"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[90%] md:max-w-[75%] rounded-xl px-4 py-3 text-sm whitespace-pre-wrap ${
                m.role === "user" ? "bg-accent text-accent-fg" : "bg-surface border border-border text-text"
              }`}
            >
              {m.text}

              {m.role === "assistant" && m.agentic && m.steps && m.steps.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[10px] text-accent bg-accent/10 border border-accent/30 rounded-md px-2 py-1 w-fit">
                    <Bot size={11} />
                    Worked it out in {m.steps.length} step{m.steps.length === 1 ? "" : "s"}:{" "}
                    {m.steps.map((s) => friendlyToolLabel(s.tool)).join(" → ")}
                  </div>
                  {m.steps.map((s, i) => (
                    <ProposalCard key={i} result={s.result} />
                  ))}
                </div>
              )}

              {m.role === "assistant" && m.confidence !== undefined && (
                <div className="mt-2 flex items-center gap-1.5 text-[10px] text-text-muted">
                  <div className="w-16 h-1.5 rounded-full bg-surface-2 overflow-hidden">
                    <div
                      className={`h-full ${m.confidence > 0.7 ? "bg-accent" : m.confidence > 0.4 ? "bg-warning" : "bg-danger"}`}
                      style={{ width: `${Math.round(m.confidence * 100)}%` }}
                    />
                  </div>
                  {confidenceLabel(m.confidence)}
                </div>
              )}

              {m.citations && m.citations.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border space-y-1.5">
                  <div className="text-[10px] uppercase tracking-wide text-text-muted flex items-center gap-1">
                    <FileText size={11} /> Where this came from
                  </div>
                  {m.citations.map((c, i) => (
                    <div key={i} className="text-xs text-text-muted bg-canvas/60 rounded-md px-2 py-1.5">
                      <Link href={`/documents?id=${c.documentId}`} className="text-accent font-medium hover:underline">
                        [{i + 1}] {c.documentTitle}
                      </Link>
                      <span className="text-text-muted"> · {c.documentType.replace(/_/g, " ")}</span>
                      <div className="text-text-muted mt-0.5">{c.snippet}</div>
                    </div>
                  ))}
                </div>
              )}

              {m.graphFacts && m.graphFacts.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border space-y-1">
                  <div className="text-[10px] uppercase tracking-wide text-text-muted flex items-center gap-1">
                    <Network size={11} /> Related connections used
                  </div>
                  {m.graphFacts.slice(0, 4).map((f, i) => (
                    <div key={i} className="text-xs text-info">
                      {formatGraphFact(f)}
                    </div>
                  ))}
                </div>
              )}

              {m.role === "assistant" && m.question && (
                <div className="mt-3 pt-3 border-t border-border flex items-center gap-2">
                  <span className="text-[10px] text-text-muted">Was this helpful?</span>
                  {m.rated ? (
                    <span className="flex items-center gap-1 text-[10px] text-accent">
                      <Check size={11} /> Thanks for the feedback
                    </span>
                  ) : (
                    <>
                      <button
                        onClick={() => rate(m, "up")}
                        aria-label="Helpful"
                        className="text-text-muted hover:text-accent"
                      >
                        <ThumbsUp size={13} />
                      </button>
                      <button
                        onClick={() => rate(m, "down")}
                        aria-label="Not helpful"
                        className="text-text-muted hover:text-danger"
                      >
                        <ThumbsDown size={13} />
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-surface border border-border rounded-xl px-4 py-3 text-sm text-text-muted flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" /> Looking through documents for an answer...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
        className="sticky bottom-16 md:bottom-0 bg-canvas border-t border-border px-4 md:px-0 py-3 flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about equipment, maintenance history, procedures, or compliance..."
          className="flex-1 bg-surface border border-border-strong rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-accent hover:bg-accent-strong disabled:opacity-50 text-accent-fg rounded-lg px-3 flex items-center justify-center"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
