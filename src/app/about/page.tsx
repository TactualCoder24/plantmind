"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, HardHat, Wrench, ShieldCheck, FileText, Bot, ShieldQuestion, Lock, CheckCircle2 } from "lucide-react";
import mainLogo from "@/mainlogo.jpg";

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-10 space-y-12">
      <div className="space-y-4">
        <Link href="/" className="inline-flex items-center">
          <Image src={mainLogo} alt="Innfetch" width={140} height={140} className="rounded-xl" priority />
        </Link>
        <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight">What is Innfetch?</h1>
        <p className="text-text-muted text-base md:text-lg">
          In one line: Innfetch is a place to put everything your plant already has on paper — and
          then ask it questions in plain English, instead of digging through folders yourself.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold text-text">The problem it solves</h2>
        <p className="text-text-secondary leading-relaxed">
          Every plant already has the answers written down somewhere — in equipment manuals, work
          orders, inspection reports, SOPs, and regulations. The problem is never that the
          information doesn&apos;t exist. It&apos;s that finding the right piece of it, connecting
          it to three other documents, and doing that in the middle of a shift takes 30-45 minutes
          of cross-referencing. Innfetch reads all of that once, and then answers in seconds — and
          always shows you exactly which document it got the answer from, so you can trust it.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold text-text">Who it&apos;s for</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <RoleCard icon={HardHat} title="Field Technicians" desc="Quick answers while standing at the equipment — specs, torque values, procedures." />
          <RoleCard icon={Wrench} title="Maintenance Engineers" desc="Root-cause help that checks history, nearby equipment, and trends for you." />
          <RoleCard icon={ShieldCheck} title="Compliance Officers" desc="A running check of regulations against real records, so gaps surface before an audit does." />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold text-text">How it actually works</h2>
        <ol className="space-y-3">
          <Step n={1} title="You add documents">
            Paste text, or upload a photo, PDF, or spreadsheet. Innfetch reads it automatically —
            no manual tagging, no separate scanning software.
          </Step>
          <Step n={2} title="You ask a question, or point it at a problem">
            Type a question in plain English, or pick a piece of equipment and ask &quot;why does
            this keep failing?&quot; Innfetch figures out on its own which documents and records to
            check — it doesn&apos;t just search for keywords, it reasons about what it finds.
          </Step>
          <Step n={3} title="You get an answer you can check">
            Every answer shows exactly which document it came from. If Innfetch thinks a concrete
            fix is needed, it can draft a work order or flag a compliance gap — but it never
            creates anything by itself. You decide.
          </Step>
        </ol>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold text-text">
          &quot;Agentic AI&quot; — in plain language
        </h2>
        <p className="text-text-secondary leading-relaxed">
          You&apos;ll see the word &quot;agentic&quot; around the app. Here&apos;s what it actually
          means, no jargon: most software follows a fixed set of steps every time. Innfetch&apos;s
          copilot, root-cause tool, and compliance checker are different — each one decides for
          itself, question by question, what to look at and in what order, the way a person would.
          Ask about one piece of equipment and it might check its repair history and stop there.
          Ask a harder question and it might check history, nearby equipment, and compliance
          records before answering. That&apos;s what makes it &quot;agentic&quot; rather than a
          fixed script.
        </p>
        <p className="text-text-secondary leading-relaxed">
          What it does <em>not</em> mean: Innfetch never takes a real action — creating a work
          order, flagging a compliance issue — without you clicking a button to confirm it first.
          It can suggest. It can&apos;t act on its own.
        </p>
        <div className="rounded-xl border border-border bg-surface p-4 flex items-start gap-3">
          <ShieldQuestion size={18} className="text-accent shrink-0 mt-0.5" />
          <p className="text-sm text-text-muted">
            We also try not to oversell it: the compliance regulation list, for example, is a
            straightforward rule-based check (not AI) unless you specifically ask the AI to
            investigate a regulation. See <Link href="/features" className="text-accent hover:underline">the full features list</Link> for
            an honest breakdown of what&apos;s genuinely AI-driven and what&apos;s a simpler,
            reliable rule.
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold text-text">Why trust it</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <TrustPoint icon={FileText} title="Every answer is sourced" desc="No answer without a citation back to the actual document it came from." />
          <TrustPoint icon={Bot} title="It shows its work" desc="Every question is logged with exactly what was checked, reviewable anytime." />
          <TrustPoint icon={Lock} title="You confirm every action" desc="Drafted work orders and compliance flags need your explicit click to become real." />
          <TrustPoint icon={CheckCircle2} title="Works without an account" desc="Explore the whole thing with zero setup — sign in only if you want to save your session." />
        </div>
      </section>

      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center gap-2 bg-accent hover:bg-accent-strong text-accent-fg font-medium px-5 py-3 rounded-lg text-sm"
        >
          Try the Dashboard <ArrowRight size={16} />
        </Link>
        <Link
          href="/features"
          className="inline-flex items-center justify-center gap-2 border border-border hover:border-border-strong text-text-secondary hover:text-text font-medium px-5 py-3 rounded-lg text-sm"
        >
          See All Features
        </Link>
      </div>
    </div>
  );
}

function RoleCard({ icon: Icon, title, desc }: { icon: typeof HardHat; title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 space-y-2">
      <span className="h-9 w-9 rounded-lg bg-accent/10 text-accent flex items-center justify-center">
        <Icon size={17} />
      </span>
      <div className="text-sm font-medium text-text">{title}</div>
      <div className="text-xs text-text-muted">{desc}</div>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-4">
      <span className="h-8 w-8 rounded-full bg-accent text-accent-fg font-display font-semibold text-sm flex items-center justify-center shrink-0">
        {n}
      </span>
      <div>
        <div className="font-medium text-text">{title}</div>
        <p className="text-sm text-text-muted mt-1">{children}</p>
      </div>
    </li>
  );
}

function TrustPoint({ icon: Icon, title, desc }: { icon: typeof FileText; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4">
      <Icon size={17} className="text-accent shrink-0 mt-0.5" />
      <div>
        <div className="text-sm font-medium text-text">{title}</div>
        <div className="text-xs text-text-muted mt-0.5">{desc}</div>
      </div>
    </div>
  );
}
