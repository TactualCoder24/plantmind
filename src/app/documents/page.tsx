"use client";

import { useEffect, useState } from "react";
import { Upload, FileText, Image as ImageIcon, Loader2, Table } from "lucide-react";
import { DocType } from "@/lib/types";

interface DocSummary {
  id: string;
  title: string;
  type: DocType;
  filename: string;
  uploadedAt: string;
  entities: { equipmentTags: string[]; personnel: string[]; regulatoryRefs: string[] };
  fileUrl?: string;
  sourceKind?: "text" | "scan";
}

const TYPES: DocType[] = ["equipment_spec", "work_order", "sop", "inspection_report", "regulation", "incident_report", "shift_log", "email"];

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] || "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function DocumentsPage() {
  const [docs, setDocs] = useState<DocSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", type: "sop" as DocType, content: "" });
  const [scanFile, setScanFile] = useState<File | null>(null);
  const [filter, setFilter] = useState<string>("all");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/documents");
    const data = await res.json();
    setDocs(data.documents);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleTextFile(file: File) {
    const text = await file.text();
    setScanFile(null);
    setForm((f) => ({ ...f, title: f.title || file.name.replace(/\.[^.]+$/, ""), content: text }));
  }

  // Turns a CSV (inspection logs, parts inventory, etc.) into a readable text block —
  // reuses the existing plain-text ingestion path rather than needing a separate pipeline.
  async function handleSpreadsheetFile(file: File) {
    const raw = await file.text();
    const rows = raw
      .split(/\r?\n/)
      .filter((line) => line.trim().length > 0)
      .map((line) => line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, "")));
    if (rows.length === 0) return;
    const [header, ...body] = rows;
    const formatted = body
      .map((row, i) => `Row ${i + 1}: ` + header.map((h, j) => `${h || `column ${j + 1}`}: ${row[j] ?? ""}`).join(", "))
      .join("\n");
    setScanFile(null);
    setForm((f) => ({
      ...f,
      title: f.title || file.name.replace(/\.[^.]+$/, ""),
      type: f.type === "sop" ? "inspection_report" : f.type,
      content: formatted,
    }));
  }

  function handleScanFile(file: File) {
    setForm((f) => ({ ...f, title: f.title || file.name.replace(/\.[^.]+$/, ""), content: "" }));
    setScanFile(file);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setUploadError(null);
    if (!form.title || (!form.content && !scanFile)) return;
    setUploading(true);

    if (scanFile) {
      const base64Data = await fileToBase64(scanFile);
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          type: form.type,
          filename: scanFile.name,
          base64Data,
          mimeType: scanFile.type,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        setUploadError(err.error || "Vision ingestion failed");
        setUploading(false);
        return;
      }
    } else {
      await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: form.title, type: form.type, filename: `${form.title}.txt`, content: form.content }),
      });
    }

    setForm({ title: "", type: "sop", content: "" });
    setScanFile(null);
    await load();
    setUploading(false);
  }

  const filtered = filter === "all" ? docs : docs.filter((d) => d.type === filter);

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-8 space-y-8">
      <div>
        <h1 className="text-lg font-display font-semibold text-text">Add Documents</h1>
        <p className="text-sm text-text-muted mt-1">
          Paste in text, or upload a file — a photo of a paperwork form, a PDF, or a spreadsheet of
          inspection logs. Photos and PDFs are read automatically, no scanning software needed.
        </p>
      </div>

      <form onSubmit={submit} className="rounded-xl border border-border bg-surface p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Document title"
            className="flex-1 bg-canvas border border-border-strong rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-accent"
          />
          <select
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as DocType }))}
            className="bg-canvas border border-border-strong rounded-lg px-3 py-2 text-sm text-text"
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>

        {scanFile ? (
          <div className="flex items-center gap-2 text-xs text-text-secondary bg-canvas border border-border-strong rounded-lg px-3 py-2">
            <ImageIcon size={14} className="text-info" />
            {scanFile.name} — will be read automatically when you add it
            <button type="button" onClick={() => setScanFile(null)} className="ml-auto text-text-muted hover:text-text-secondary">
              remove
            </button>
          </div>
        ) : (
          <textarea
            value={form.content}
            onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            placeholder="Paste document content, or choose a file below..."
            rows={5}
            className="w-full bg-canvas border border-border-strong rounded-lg px-3 py-2 text-sm font-mono text-text placeholder:text-text-muted focus:outline-none focus:border-accent"
          />
        )}

        {uploadError && <p className="text-xs text-danger">{uploadError}</p>}

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex gap-2 flex-wrap">
            <label className="flex items-center gap-2 text-xs text-text-muted cursor-pointer border border-dashed border-border-strong rounded-lg px-3 py-2 hover:border-accent/60">
              <Upload size={14} />
              Text file (.txt, .md)
              <input
                type="file"
                accept=".txt,.md"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleTextFile(e.target.files[0])}
              />
            </label>
            <label className="flex items-center gap-2 text-xs text-text-muted cursor-pointer border border-dashed border-border-strong rounded-lg px-3 py-2 hover:border-info/60">
              <ImageIcon size={14} />
              Photo, scan or PDF
              <input
                type="file"
                accept=".pdf,image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleScanFile(e.target.files[0])}
              />
            </label>
            <label className="flex items-center gap-2 text-xs text-text-muted cursor-pointer border border-dashed border-border-strong rounded-lg px-3 py-2 hover:border-warning/60">
              <Table size={14} />
              Spreadsheet (.csv)
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleSpreadsheetFile(e.target.files[0])}
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={uploading || !form.title || (!form.content && !scanFile)}
            className="bg-accent hover:bg-accent-strong disabled:opacity-50 text-accent-fg font-medium rounded-lg px-4 py-2 text-sm flex items-center gap-2 w-full md:w-auto justify-center"
          >
            {uploading && <Loader2 size={14} className="animate-spin" />}
            Add Document
          </button>
        </div>
      </form>

      <div className="flex items-center gap-2 flex-wrap">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")} label={`All (${docs.length})`} />
        {TYPES.map((t) => {
          const count = docs.filter((d) => d.type === t).length;
          if (count === 0) return null;
          return <FilterChip key={t} active={filter === t} onClick={() => setFilter(t)} label={`${t.replace("_", " ")} (${count})`} />;
        })}
      </div>

      {loading ? (
        <div className="text-sm text-text-muted flex items-center gap-2">
          <Loader2 size={14} className="animate-spin" /> Loading documents...
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-text-muted">No documents yet. Add one above, or load the demo set from the dashboard.</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {filtered.map((d) => (
            <div key={d.id} className="rounded-xl border border-border bg-surface p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  {d.sourceKind === "scan" ? (
                    <ImageIcon size={15} className="text-info shrink-0 mt-0.5" />
                  ) : (
                    <FileText size={15} className="text-accent shrink-0 mt-0.5" />
                  )}
                  <span className="text-sm font-medium text-text">{d.title}</span>
                </div>
                <span className="text-[10px] uppercase text-text-muted bg-canvas border border-border rounded px-1.5 py-0.5 shrink-0">
                  {d.type.replace("_", " ")}
                </span>
              </div>
              {d.fileUrl && d.sourceKind === "scan" && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={d.fileUrl} alt={d.title} className="rounded-lg border border-border max-h-32 object-cover" />
              )}
              <div className="flex flex-wrap gap-1">
                {d.entities.equipmentTags.map((t) => (
                  <Chip key={t} color="accent">{t}</Chip>
                ))}
                {d.entities.regulatoryRefs.map((t) => (
                  <Chip key={t} color="info">{t}</Chip>
                ))}
                {d.entities.personnel.slice(0, 3).map((t) => (
                  <Chip key={t} color="warning">{t}</Chip>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-2.5 py-1 rounded-full border ${
        active ? "bg-accent/10 border-accent/50 text-accent" : "border-border text-text-muted hover:text-text-secondary"
      }`}
    >
      {label}
    </button>
  );
}

function Chip({ children, color }: { children: React.ReactNode; color: "accent" | "info" | "warning" }) {
  const map = {
    accent: "bg-accent/10 text-accent",
    info: "bg-info/10 text-info",
    warning: "bg-warning/10 text-warning",
  };
  return <span className={`text-[10px] px-1.5 py-0.5 rounded ${map[color]}`}>{children}</span>;
}
