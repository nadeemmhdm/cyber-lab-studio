"use client";

import Link from "next/link";
import { Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import type { LabDefinition, LabDifficulty, LabPlatform } from "@/lib/labs/catalog";

const PLATFORM_LABELS: Record<LabPlatform, string> = {
  FUNDAMENTALS: "Fundamentals",
  AWS: "AWS",
  AZURE: "Azure",
  SENTINEL: "Sentinel",
  KQL: "KQL",
  DEFENDER_XDR: "Defender XDR",
};

const DIFFICULTY_LABELS: Record<LabDifficulty, string> = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
};

type Props = { labs: readonly LabDefinition[] };

type Sort = "number" | "duration" | "difficulty";

const difficultyRank: Record<LabDifficulty, number> = {
  BEGINNER: 1,
  INTERMEDIATE: 2,
  ADVANCED: 3,
};

export function LabCatalogue({ labs }: Props) {
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState<"ALL" | LabPlatform>("ALL");
  const [difficulty, setDifficulty] = useState<"ALL" | LabDifficulty>("ALL");
  const [sort, setSort] = useState<Sort>("number");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return [...labs]
      .filter((lab) => platform === "ALL" || lab.platform === platform)
      .filter((lab) => difficulty === "ALL" || lab.difficulty === difficulty)
      .filter((lab) => {
        if (!normalized) return true;
        return `${lab.number} ${lab.title} ${lab.objective} ${PLATFORM_LABELS[lab.platform]}`.toLowerCase().includes(normalized);
      })
      .sort((a, b) => {
        if (sort === "duration") return a.estimatedMinutes - b.estimatedMinutes || a.number - b.number;
        if (sort === "difficulty") return difficultyRank[a.difficulty] - difficultyRank[b.difficulty] || a.number - b.number;
        return a.number - b.number;
      });
  }, [difficulty, labs, platform, query, sort]);

  return (
    <div>
      <div className="glass rounded-2xl p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto_auto]">
          <label className="relative block">
            <span className="sr-only">Search labs</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 muted" size={18} aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search labs, platforms, or objectives…"
              className="focus-ring w-full rounded-xl border py-2.5 pl-10 pr-3 text-sm outline-none"
              style={{ borderColor: "var(--border)", background: "var(--surface-strong)", color: "var(--foreground)" }}
            />
          </label>

          <label className="flex items-center gap-2 rounded-xl border px-3" style={{ borderColor: "var(--border)", background: "var(--surface-strong)" }}>
            <SlidersHorizontal size={16} className="muted" aria-hidden="true" />
            <span className="sr-only">Platform</span>
            <select value={platform} onChange={(event) => setPlatform(event.target.value as "ALL" | LabPlatform)} className="focus-ring bg-transparent py-2.5 text-sm outline-none">
              <option value="ALL">All platforms</option>
              {Object.entries(PLATFORM_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>

          <label className="rounded-xl border px-3" style={{ borderColor: "var(--border)", background: "var(--surface-strong)" }}>
            <span className="sr-only">Difficulty</span>
            <select value={difficulty} onChange={(event) => setDifficulty(event.target.value as "ALL" | LabDifficulty)} className="focus-ring bg-transparent py-2.5 text-sm outline-none">
              <option value="ALL">All difficulty</option>
              {Object.entries(DIFFICULTY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>

          <label className="rounded-xl border px-3" style={{ borderColor: "var(--border)", background: "var(--surface-strong)" }}>
            <span className="sr-only">Sort labs</span>
            <select value={sort} onChange={(event) => setSort(event.target.value as Sort)} className="focus-ring bg-transparent py-2.5 text-sm outline-none">
              <option value="number">Sort: Lab number</option>
              <option value="duration">Sort: Duration</option>
              <option value="difficulty">Sort: Difficulty</option>
            </select>
          </label>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between text-sm muted">
        <span>{filtered.length} of {labs.length} labs</span>
        <span>Catalogue foundation</span>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-6 rounded-2xl border p-10 text-center" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <h2 className="text-lg font-semibold">No matching labs</h2>
          <p className="mt-2 muted">Clear a filter or try a different search term.</p>
        </div>
      ) : (
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((lab) => (
            <article key={lab.number} className="flex min-h-[300px] flex-col rounded-2xl border p-5" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--accent)" }}>Lab {String(lab.number).padStart(2, "0")}</span>
                  <h2 className="mt-2 text-xl font-semibold tracking-tight">{lab.title}</h2>
                </div>
                <span className="rounded-lg px-2.5 py-1 text-xs font-semibold" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                  {PLATFORM_LABELS[lab.platform]}
                </span>
              </div>

              <p className="mt-4 flex-1 text-sm leading-6 muted">{lab.objective}</p>

              <div className="mt-5 flex flex-wrap gap-2 text-xs">
                <span className="rounded-lg border px-2.5 py-1" style={{ borderColor: "var(--border)" }}>{DIFFICULTY_LABELS[lab.difficulty]}</span>
                <span className="rounded-lg border px-2.5 py-1" style={{ borderColor: "var(--border)" }}>{lab.estimatedMinutes} min</span>
                <span className="rounded-lg border px-2.5 py-1" style={{ borderColor: "var(--border)" }}>Not started</span>
              </div>

              <Link href={`/labs/${lab.slug}`} className="focus-ring mt-5 inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-white" style={{ background: "var(--accent)" }}>
                Open lab
              </Link>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
