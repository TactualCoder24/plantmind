"use client";

import Link from "next/link";
import {
  Sparkles,
  MessageSquare,
  Bot,
  Network,
  FileText,
  Image as ImageIcon,
  Table,
  Eye,
  ShieldCheck,
  ShieldQuestion,
  Download,
  TrendingUp,
  ListChecks,
  Bell,
  KeyRound,
  Cloud,
  Sun,
  Users,
  ThumbsUp,
  ClipboardPlus,
} from "lucide-react";

interface Feature {
  icon: typeof Sparkles;
  title: string;
  desc: string;
  href?: string;
  tag?: string;
}

interface Group {
  title: string;
  blurb: string;
  features: Feature[];
}

const GROUPS: Group[] = [
  {
    title: "Ask & investigate",
    blurb: "Two genuinely agentic tool-users, both with graceful fallbacks if there's no AI key.",
    features: [
      {
        icon: MessageSquare,
        title: "Agentic Copilot",
        desc: "Decides for itself which documents, equipment history, or compliance records to check before answering — not a fixed search-then-summarize pipeline.",
        href: "/chat",
        tag: "Agentic",
      },
      {
        icon: Bot,
        title: "Root Cause Agent",
        desc: "Given an equipment tag, autonomously chains work-order history, co-located equipment, trend checks, and compliance status into a cited RCA report.",
        href: "/rca",
        tag: "Agentic",
      },
      {
        icon: ClipboardPlus,
        title: "Propose & confirm actions",
        desc: "When the evidence supports it, either agent can draft a work order or a compliance follow-up — but only ever as a proposal you explicitly confirm, never auto-created.",
        tag: "Agentic",
      },
      {
        icon: Network,
        title: "Knowledge Graph",
        desc: "Equipment, procedures, people, incidents and regulations linked — not just indexed. Trace how one failure connects to another.",
        href: "/graph",
      },
    ],
  },
  {
    title: "Get documents in",
    blurb: "Any source, read automatically.",
    features: [
      { icon: FileText, title: "Paste or upload text", desc: "Plain text or Markdown, ingested and entity-extracted immediately." },
      { icon: ImageIcon, title: "Photo, scan or PDF", desc: "Vision extraction transcribes and extracts entities in one pass — no separate OCR step." },
      { icon: Table, title: "Spreadsheet (.csv)", desc: "Inspection logs or parts inventory, parsed into readable rows and ingested like any other document." },
      { icon: Eye, title: "View any document", desc: "Full content, entity tags, and the original file (for scans) in a viewer — reachable directly from citations.", href: "/documents" },
    ],
  },
  {
    title: "Stay ahead of problems",
    blurb: "Not just reacting after something breaks.",
    features: [
      {
        icon: TrendingUp,
        title: "Predictive trend flagging",
        desc: "Trends vibration/temperature readings per equipment over time and flags whichever peaked near its alarm threshold — even after a fix brought it back down.",
        href: "/dashboard",
      },
      { icon: Bell, title: "Notification digest", desc: "On-demand summary of open compliance gaps, trending equipment, and recently added documents.", href: "/dashboard" },
      { icon: ShieldCheck, title: "Compliance check", desc: "Compares regulations against current procedures and inspection records, flags what's missing or out of date.", href: "/compliance" },
      { icon: ShieldQuestion, title: "Compliance follow-up flags", desc: "Specific gaps — raised by you or proposed by the copilot — tracked until resolved.", href: "/compliance" },
      { icon: Download, title: "CSV export", desc: "One-click compliance report export, formatted for an auditor." },
    ],
  },
  {
    title: "Trust, but verify",
    blurb: "Every answer is checkable, not just plausible.",
    features: [
      { icon: ListChecks, title: "Audit log", desc: "Every copilot answer persisted with what it checked and cited — review it after the fact instead of just trusting it.", href: "/audit" },
      { icon: ThumbsUp, title: "Feedback loop", desc: "Thumbs up/down on any answer, tracked as a quality signal." },
    ],
  },
  {
    title: "Platform",
    blurb: "Built to actually deploy, not just demo locally.",
    features: [
      { icon: KeyRound, title: "Real Supabase Auth", desc: "Sign up, sign in, sign out with real accounts — doesn't gate exploring the app.", href: "/login" },
      { icon: Cloud, title: "Persistent, serverless-safe storage", desc: "State lives in Supabase (Storage + a durable blob) instead of local disk, so it actually survives on Vercel." },
      { icon: Sun, title: "Light & dark mode", desc: "Full theme system, persisted per device." },
      { icon: Users, title: "Role-aware views", desc: "Field Technician, Maintenance Engineer, and Compliance Officer each get a dashboard and answer framing tailored to their job." },
    ],
  },
];

export default function FeaturesPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 space-y-10">
      <div className="space-y-2">
        <h1 className="text-lg font-display font-semibold text-text flex items-center gap-2">
          <Sparkles size={18} className="text-accent" /> Everything Innfetch Does
        </h1>
        <p className="text-sm text-text-muted max-w-2xl">
          A full tour of what's built — what's genuinely agentic, what's rule-based, and what's
          plain CRUD, labeled honestly rather than calling everything "AI."
        </p>
      </div>

      {GROUPS.map((group) => (
        <section key={group.title} className="space-y-4">
          <div>
            <h2 className="text-base font-display font-semibold text-text">{group.title}</h2>
            <p className="text-sm text-text-muted mt-0.5">{group.blurb}</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {group.features.map((f) => {
              const Card = (
                <div
                  className={`h-full rounded-xl border border-border bg-surface p-4 space-y-2 ${
                    f.href ? "hover:border-accent/60 transition-colors" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <f.icon size={18} className="text-accent" />
                    {f.tag && (
                      <span className="text-[10px] uppercase tracking-wide text-accent bg-accent/10 border border-accent/30 rounded-full px-2 py-0.5">
                        {f.tag}
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-medium text-text">{f.title}</div>
                  <div className="text-xs text-text-muted">{f.desc}</div>
                </div>
              );
              return f.href ? (
                <Link key={f.title} href={f.href} className="block h-full">
                  {Card}
                </Link>
              ) : (
                <div key={f.title} className="h-full">
                  {Card}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
