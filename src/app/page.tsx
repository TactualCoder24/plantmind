"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  HardHat,
  Wrench,
  ShieldCheck,
  MessageSquare,
  Network,
  FileText,
  Bot,
  Sun,
  Moon,
  LogIn,
  Upload,
  Sparkles,
  ClipboardPlus,
  TrendingUp,
  ListChecks,
  KeyRound,
  Cloud,
  ThumbsUp,
} from "lucide-react";
import { useRole } from "@/lib/roleContext";
import { useTheme } from "@/lib/themeContext";
import { useAuth } from "@/lib/authContext";
import { Logo } from "@/components/Logo";
import { Role } from "@/lib/types";

const ROLES: { role: Role; title: string; icon: typeof HardHat; blurb: string; asks: string }[] = [
  {
    role: "technician",
    title: "Field Technician",
    icon: HardHat,
    blurb: "Quick, straightforward answers pulled from procedures and repair history — while you're standing at the equipment.",
    asks: "“What's the torque spec on the C-301 coupling bolts?”",
  },
  {
    role: "engineer",
    title: "Maintenance Engineer",
    icon: Wrench,
    blurb: "Answers that dig into root causes automatically — checking work orders, equipment history, and nearby machines for you.",
    asks: "“Why did C-301 trip in July 2025, and had this happened before?”",
  },
  {
    role: "compliance",
    title: "Compliance Officer",
    icon: ShieldCheck,
    blurb: "Answers that check your regulations against real records and flag anything missing, before an auditor finds it.",
    asks: "“What's the compliance status of B-201?”",
  },
];

const HOW_IT_WORKS = [
  {
    icon: Upload,
    title: "Add what you already have",
    desc: "Paste text, or upload a photo, PDF, or spreadsheet — specs, work orders, SOPs, inspection reports, regulations. Read automatically, no manual tagging.",
  },
  {
    icon: Sparkles,
    title: "Ask, investigate, or check compliance",
    desc: "Three agents — copilot, root-cause, and compliance — decide for themselves which documents and records to check before answering.",
  },
  {
    icon: ClipboardPlus,
    title: "Confirm the action, or don't",
    desc: "If an agent finds something actionable, it drafts a work order or a compliance flag — but only your click actually creates it.",
  },
];

const AGENTIC_POINTS = [
  { icon: MessageSquare, title: "Agentic Copilot", desc: "Decides which documents, history, or compliance records to check before answering." },
  { icon: Bot, title: "Agentic Root Cause", desc: "Chains equipment history, trend data, and compliance status into one cited report." },
  { icon: ShieldCheck, title: "Agentic Compliance", desc: "Reads the actual regulation text and reasons about it — not just keyword matching." },
  { icon: TrendingUp, title: "Autonomous sweep", desc: "Finds every asset trending toward alarm and investigates all of them automatically." },
];

const FEATURES = [
  { href: "/chat", icon: MessageSquare, title: "Ask a Question", desc: "Plain-language answers with the source attached, every time." },
  { href: "/rca", icon: Bot, title: "Find the Root Cause", desc: "Automatically investigates why something failed, step by step." },
  { href: "/compliance", icon: ShieldCheck, title: "Check Compliance", desc: "Rule-based scan plus an AI agent that reads and reasons about each regulation." },
  { href: "/graph", icon: Network, title: "See the Connections", desc: "Equipment, procedures, people and incidents — linked, not just filed away." },
  { href: "/documents", icon: FileText, title: "Add Any Document", desc: "Paste text, or upload a photo, PDF, or spreadsheet — it's read automatically." },
  { href: "/dashboard", icon: TrendingUp, title: "Catch Trends Early", desc: "Flags equipment trending toward alarm, even after a fix brought it back down." },
  { href: "/audit", icon: ListChecks, title: "Audit Every Answer", desc: "Every copilot answer logged with exactly what it checked and cited." },
  { href: "/features", icon: Sparkles, title: "Everything Else", desc: "Feedback loop, CSV export, role-aware views, and more." },
];

const PLATFORM_POINTS = [
  { icon: KeyRound, label: "Real Supabase Auth" },
  { icon: Cloud, label: "Persistent, serverless-safe storage" },
  { icon: ListChecks, label: "Full audit trail" },
  { icon: ThumbsUp, label: "Feedback loop on every answer" },
];

export default function LandingPage() {
  const router = useRouter();
  const { setRole } = useRole();
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();

  function enterAs(role: Role) {
    setRole(role);
    router.push("/dashboard");
  }

  return (
    <div className="min-h-full">
      {/* Minimal marketing header */}
      <header className="flex items-center justify-between px-4 md:px-8 py-4 max-w-6xl mx-auto">
        <Link href="/" className="flex items-center gap-2 font-display font-semibold text-text">
          <Logo size={28} />
          Innfetch
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/features" className="hidden sm:flex items-center gap-1.5 text-sm text-text-secondary hover:text-text px-3 py-1.5">
            Features
          </Link>
          <button
            onClick={toggleTheme}
            aria-label="Toggle light / dark theme"
            className="h-8 w-8 flex items-center justify-center rounded-md border border-border text-text-secondary hover:text-text hover:border-border-strong"
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          {user ? (
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 border border-border text-sm text-text-secondary hover:text-text hover:border-border-strong rounded-md px-3 py-1.5"
            >
              {user.email}
            </Link>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1.5 border border-border text-sm text-text-secondary hover:text-text hover:border-border-strong rounded-md px-3 py-1.5"
            >
              <LogIn size={14} />
              Sign in
            </Link>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 md:px-8 pt-12 md:pt-20 pb-16 md:pb-24 grid md:grid-cols-[1.15fr_0.85fr] gap-10 items-center">
        <div className="space-y-6">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-accent bg-accent/10 border border-accent/30 rounded-full px-3 py-1">
            Unified asset &amp; operations brain
          </span>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight leading-[1.05]">
            Every P&amp;ID, work order and SOP.
            <span className="text-accent"> One answer, with citations.</span>
          </h1>
          <p className="text-text-muted text-base md:text-lg max-w-xl">
            Innfetch brings your equipment specs, work orders, procedures, inspection reports and
            regulations into one place — so anyone on the floor can ask a plain-language question
            and get a trustworthy answer, with its source, in seconds instead of a 40-minute paper
            chase.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 bg-accent hover:bg-accent-strong text-accent-fg font-medium px-5 py-3 rounded-lg text-sm"
            >
              Open Dashboard <ArrowRight size={16} />
            </Link>
            <Link
              href="/chat"
              className="inline-flex items-center justify-center gap-2 border border-border hover:border-border-strong text-text-secondary hover:text-text font-medium px-5 py-3 rounded-lg text-sm"
            >
              Try Asking a Question
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5 md:p-6 space-y-4">
          <div className="text-xs uppercase tracking-wide text-text-muted">Time saved on a real question</div>
          <div className="space-y-1.5 text-sm">
            <div className="text-text-secondary italic">
              &quot;Why did C-301 trip in July 2025, and had this happened before?&quot;
            </div>
            <div className="flex gap-2 items-start">
              <span className="text-[10px] uppercase tracking-wide bg-danger/10 text-danger px-1.5 py-0.5 rounded shrink-0 mt-0.5">Before</span>
              <span className="text-text-muted">~35-45 min cross-referencing 4+ systems by hand</span>
            </div>
            <div className="flex gap-2 items-start">
              <span className="text-[10px] uppercase tracking-wide bg-accent/10 text-accent px-1.5 py-0.5 rounded shrink-0 mt-0.5">After</span>
              <span className="text-text-muted">&lt; 10 sec — full cited causal chain</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border">
            <MiniStat label="Document types" value="8" />
            <MiniStat label="Auto-connected" value="Yes" />
            <MiniStat label="Setup needed" value="None" />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-4 md:px-8 py-14 md:py-20 border-t border-border">
        <div className="max-w-2xl mb-8 md:mb-10">
          <h2 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">How it works</h2>
          <p className="text-text-muted mt-2 text-sm md:text-base">Three steps, and a human confirms anything that actually changes something.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {HOW_IT_WORKS.map((s, i) => (
            <div key={s.title} className="rounded-2xl border border-border bg-surface p-6 space-y-3">
              <div className="flex items-center gap-3">
                <span className="h-8 w-8 rounded-full bg-accent text-accent-fg font-display font-semibold text-sm flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <s.icon size={20} className="text-accent" />
              </div>
              <div className="font-display font-semibold text-text">{s.title}</div>
              <p className="text-sm text-text-muted">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Agentic AI, honestly */}
      <section className="max-w-6xl mx-auto px-4 md:px-8 py-14 md:py-20 border-t border-border">
        <div className="max-w-2xl mb-8 md:mb-10">
          <h2 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">Real agentic AI, labeled honestly</h2>
          <p className="text-text-muted mt-2 text-sm md:text-base max-w-2xl">
            Three agents decide for themselves which tools to use — not a fixed script. Every one
            of them can propose a work order or a compliance flag, but none of them can create one
            without you clicking confirm.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {AGENTIC_POINTS.map((p) => (
            <div key={p.title} className="rounded-xl border border-border bg-surface p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p.icon size={18} className="text-accent" />
                <span className="text-[10px] uppercase tracking-wide text-accent bg-accent/10 border border-accent/30 rounded-full px-2 py-0.5">
                  Agentic
                </span>
              </div>
              <div className="text-sm font-medium text-text">{p.title}</div>
              <div className="text-xs text-text-muted">{p.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Role selection */}
      <section className="max-w-6xl mx-auto px-4 md:px-8 py-14 md:py-20 border-t border-border">
        <div className="max-w-2xl mb-8 md:mb-10">
          <h2 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">Built for every role on the floor</h2>
          <p className="text-text-muted mt-2 text-sm md:text-base">
            Pick how you work, and every answer is framed for that job — same information, explained the way you need it.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {ROLES.map((r) => (
            <button
              key={r.role}
              onClick={() => enterAs(r.role)}
              className="text-left rounded-2xl border border-border bg-surface p-6 hover:border-accent/60 transition-colors group flex flex-col gap-4"
            >
              <span className="h-11 w-11 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
                <r.icon size={20} />
              </span>
              <div>
                <div className="font-display font-semibold text-text">{r.title}</div>
                <p className="text-sm text-text-muted mt-1.5">{r.blurb}</p>
              </div>
              <div className="text-xs text-text-secondary italic mt-auto">{r.asks}</div>
              <span className="flex items-center gap-1.5 text-sm font-medium text-accent">
                Enter as {r.title} <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Feature grid */}
      <section className="max-w-6xl mx-auto px-4 md:px-8 py-14 md:py-20 border-t border-border">
        <div className="max-w-2xl mb-8 md:mb-10">
          <h2 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">Everything in one place</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {FEATURES.map((f) => (
            <Link key={f.href} href={f.href} className="rounded-xl border border-border bg-surface p-4 hover:border-accent/60 transition-colors">
              <f.icon size={18} className="text-accent mb-2" />
              <div className="text-sm font-medium text-text">{f.title}</div>
              <div className="text-xs text-text-muted mt-1">{f.desc}</div>
            </Link>
          ))}
        </div>
        <Link href="/features" className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline mt-4">
          See the full feature list <ArrowRight size={14} />
        </Link>
      </section>

      {/* Platform trust strip */}
      <section className="max-w-6xl mx-auto px-4 md:px-8 py-10 border-t border-border">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3 justify-center text-text-muted">
          {PLATFORM_POINTS.map((p) => (
            <div key={p.label} className="flex items-center gap-2 text-sm">
              <p.icon size={15} className="text-accent" />
              {p.label}
            </div>
          ))}
        </div>
      </section>

      <footer className="max-w-6xl mx-auto px-4 md:px-8 py-8 border-t border-border text-xs text-text-muted flex flex-col sm:flex-row gap-2 justify-between">
        <span>Innfetch — built for heavy industry.</span>
        <span>No account required to explore — sign in only if you want to save your own session.</span>
      </footer>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-sm font-display font-semibold text-text">{value}</div>
      <div className="text-[10px] text-text-muted mt-0.5">{label}</div>
    </div>
  );
}
