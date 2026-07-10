"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageSquare, FileText, Network, ShieldCheck, RefreshCw, Clock, Search, Bot } from "lucide-react";
import { useRole, ROLE_LABELS } from "@/lib/roleContext";
import { Role } from "@/lib/types";

interface Stats {
  docCount: number;
  chunkCount: number;
  nodeCount: number;
  edgeCount: number;
  byType: Record<string, number>;
}

const NAV_CARDS = [
  { href: "/chat", icon: MessageSquare, title: "Ask a Question", desc: "Ask in plain language, get an answer with sources" },
  { href: "/rca", icon: Bot, title: "Find Root Cause", desc: "Automatically investigate why equipment failed" },
  { href: "/documents", icon: FileText, title: "Documents", desc: "Add and browse everything that's been uploaded" },
  { href: "/graph", icon: Network, title: "How Everything Connects", desc: "See how equipment, people and records link up" },
  { href: "/compliance", icon: ShieldCheck, title: "Compliance Check", desc: "See what needs attention before an audit" },
];

// Same links, reordered so the most relevant thing for each role comes first.
const ROLE_ORDER: Record<Role, string[]> = {
  technician: ["/chat", "/documents", "/rca", "/graph", "/compliance"],
  engineer: ["/rca", "/chat", "/graph", "/documents", "/compliance"],
  compliance: ["/compliance", "/documents", "/chat", "/graph", "/rca"],
};

const ROLE_WELCOME: Record<Role, { title: string; body: string }> = {
  technician: {
    title: "Get answers without leaving the equipment",
    body: "Ask a plain-language question about a procedure, spec, or repair history and get a straight answer with the source attached — no digging through binders.",
  },
  engineer: {
    title: "Let the system do the digging",
    body: "Point the root-cause tool at a piece of equipment and it automatically checks repair history, nearby equipment, and compliance status, then explains what it found.",
  },
  compliance: {
    title: "Know where the gaps are before an audit does",
    body: "The compliance check compares your regulations against current procedures and inspection records, and flags anything missing or out of date.",
  },
};

export default function Dashboard() {
  const { role } = useRole();
  const [stats, setStats] = useState<Stats | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [docsRes, graphRes] = await Promise.all([fetch("/api/documents"), fetch("/api/graph")]);
    const docsData = await docsRes.json();
    const graphData = await graphRes.json();
    const byType: Record<string, number> = {};
    for (const d of docsData.documents) byType[d.type] = (byType[d.type] || 0) + 1;
    setStats({
      docCount: docsData.documents.length,
      chunkCount: docsData.documents.length,
      nodeCount: graphData.graph.nodes.length,
      edgeCount: graphData.graph.edges.length,
      byType,
    });
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function seed() {
    setSeeding(true);
    await fetch("/api/seed", { method: "POST" });
    await load();
    setSeeding(false);
  }

  const orderedCards = ROLE_ORDER[role].map((href) => NAV_CARDS.find((c) => c.href === href)!);
  const welcome = ROLE_WELCOME[role];

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 space-y-8">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-accent font-medium">{ROLE_LABELS[role]} view</p>
        <h1 className="text-2xl md:text-3xl font-display font-semibold tracking-tight">PlantMind</h1>
        <p className="text-text-muted max-w-2xl text-sm md:text-base">
          One place for your plant's equipment specs, work orders, procedures, inspection reports
          and regulations — ask a question in plain language and get an answer with the source
          attached.
        </p>
      </div>

      {!loading && stats && stats.docCount === 0 && (
        <div className="rounded-xl border border-accent/30 bg-accent/5 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="font-medium text-accent">Nothing's been added yet</p>
            <p className="text-sm text-text-muted">Load a sample set of 15 connected plant documents to see how it all works.</p>
          </div>
          <button
            onClick={seed}
            disabled={seeding}
            className="flex items-center gap-2 bg-accent hover:bg-accent-strong text-accent-fg font-medium px-4 py-2 rounded-lg text-sm shrink-0 disabled:opacity-60"
          >
            <RefreshCw size={15} className={seeding ? "animate-spin" : ""} />
            {seeding ? "Loading..." : "Load Sample Data"}
          </button>
        </div>
      )}

      <div className="rounded-xl border border-accent/30 bg-accent/5 p-5">
        <div className="font-display font-semibold text-text">{welcome.title}</div>
        <p className="text-sm text-text-muted mt-1.5 max-w-2xl">{welcome.body}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Documents added" value={stats?.docCount ?? "—"} />
        <StatCard label="Things tracked" value={stats?.nodeCount ?? "—"} />
        <StatCard label="Connections found" value={stats?.edgeCount ?? "—"} />
        <StatCard label="Document types" value={stats ? Object.keys(stats.byType).length : "—"} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center gap-2 text-text-secondary font-medium mb-3">
            <Clock size={16} className="text-warning" /> Time saved on a real question
          </div>
          <div className="space-y-3 text-sm">
            <Comparison
              label={'"Why did C-301 trip in July 2025, and had this happened before?"'}
              before="~35-45 min manually cross-referencing work orders, inspection reports and incident logs across 4+ systems"
              after="Under 10 seconds — full answer with the chain of events and sources"
            />
          </div>
        </div>
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center gap-2 text-text-secondary font-medium mb-3">
            <Search size={16} className="text-info" /> Why this beats a search bar
          </div>
          <p className="text-sm text-text-muted">
            A search bar finds documents that match your words. This finds how things are actually
            connected — equipment, procedures, people, incidents and regulations — so it can answer
            questions no single document has the full answer to.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {orderedCards.map((c) => (
          <NavCard key={c.href} href={c.href} icon={c.icon} title={c.title} desc={c.desc} />
        ))}
      </div>

      {!loading && stats && stats.docCount > 0 && (
        <button onClick={seed} disabled={seeding} className="text-xs text-text-muted hover:text-text-secondary underline">
          {seeding ? "Reloading..." : "Start over with sample data"}
        </button>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="text-2xl font-display font-semibold text-text">{value}</div>
      <div className="text-xs text-text-muted mt-1">{label}</div>
    </div>
  );
}

function Comparison({ label, before, after }: { label: string; before: string; after: string }) {
  return (
    <div className="space-y-1.5">
      <div className="text-text-secondary italic">{label}</div>
      <div className="flex gap-2 items-start">
        <span className="text-[10px] uppercase tracking-wide bg-danger/10 text-danger px-1.5 py-0.5 rounded shrink-0 mt-0.5">Before</span>
        <span className="text-text-muted">{before}</span>
      </div>
      <div className="flex gap-2 items-start">
        <span className="text-[10px] uppercase tracking-wide bg-accent/10 text-accent px-1.5 py-0.5 rounded shrink-0 mt-0.5">After</span>
        <span className="text-text-muted">{after}</span>
      </div>
    </div>
  );
}

function NavCard({ href, icon: Icon, title, desc }: { href: string; icon: typeof MessageSquare; title: string; desc: string }) {
  return (
    <Link href={href} className="rounded-xl border border-border bg-surface p-4 hover:border-accent/60 transition-colors">
      <Icon size={18} className="text-accent mb-2" />
      <div className="text-sm font-medium text-text">{title}</div>
      <div className="text-xs text-text-muted mt-1">{desc}</div>
    </Link>
  );
}
