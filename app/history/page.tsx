import type { Metadata } from "next";
import Link from "next/link";
import { SearchCode, TerminalSquare } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { EmptyState } from "@/components/ui/empty-state";
import { measureOperation } from "@/lib/observability/performance";

export const metadata: Metadata = { title: "History" };
export const HISTORY_PAGE_SIZE = 25;

function parsePage(value: string | undefined) {
  const page = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(page) ? Math.max(1, Math.min(1000, page)) : 1;
}

export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { user } = await requireUser();
  const { page: rawPage } = await searchParams;
  const page = parsePage(rawPage);
  const skip = (page - 1) * HISTORY_PAGE_SIZE;
  const measured = await measureOperation("history.page", () => Promise.all([
    prisma.terminalHistory.findMany({ where: { userId: user.id }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip, take: HISTORY_PAGE_SIZE + 1 }),
    prisma.queryHistory.findMany({ where: { userId: user.id }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip, take: HISTORY_PAGE_SIZE + 1 }),
  ]), { page });
  const [commandRows, queryRows] = measured.result;
  const hasNext = commandRows.length > HISTORY_PAGE_SIZE || queryRows.length > HISTORY_PAGE_SIZE;
  const commands = commandRows.slice(0, HISTORY_PAGE_SIZE);
  const queries = queryRows.slice(0, HISTORY_PAGE_SIZE);

  return <section className="shell py-10 sm:py-14"><p className="eyebrow">Audit your learning</p><h1 className="mt-2 text-4xl font-semibold tracking-tight">Command & query history</h1><p className="mt-3 muted">History is paginated to {HISTORY_PAGE_SIZE} rows per stream to keep queries bounded. Page {page}.</p><div className="mt-8 grid gap-6 xl:grid-cols-2"><History title="Terminal commands" icon={TerminalSquare} empty="Commands executed in lab simulators will appear here." rows={commands.map((row) => ({ id: row.id, primary: row.command, secondary: `${row.createdAt.toLocaleString()} · exit ${row.exitCode}` }))} /><History title="KQL queries" icon={SearchCode} empty="Executed KQL queries will appear here." rows={queries.map((row) => ({ id: row.id, primary: row.query, secondary: `${row.createdAt.toLocaleString()} · ${row.rowCount} rows · ${row.executionMs} ms` }))} /></div><nav className="mt-6 flex items-center justify-between" aria-label="History pagination">{page > 1 ? <Link className="button-secondary" href={`/history?page=${page - 1}`}>Previous</Link> : <span />}{hasNext ? <Link className="button-secondary" href={`/history?page=${page + 1}`}>Next</Link> : null}</nav></section>;
}

function History({ title, icon: Icon, rows, empty }: { title: string; icon: typeof TerminalSquare; rows: { id: string; primary: string; secondary: string }[]; empty: string }) { return <div className="panel p-6"><div className="flex items-center gap-2"><Icon size={19} style={{ color: "var(--accent)" }} aria-hidden="true" /><h2 className="text-xl font-semibold">{title}</h2></div>{rows.length ? <ol className="mt-5 space-y-3">{rows.map((row) => <li key={row.id} className="rounded-xl border p-3" style={{ borderColor: "var(--border)" }}><code className="block overflow-x-auto text-sm">{row.primary}</code><p className="mt-2 text-xs muted">{row.secondary}</p></li>)}</ol> : <div className="mt-5"><EmptyState icon={Icon} title="Nothing recorded" description={empty} /></div>}</div>; }
