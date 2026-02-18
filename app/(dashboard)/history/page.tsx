"use client";

import { useState } from "react";
import { MOCK_HISTORY } from "@/constants";

export default function HistoryPage() {
  const [query, setQuery] = useState("");

  const filtered = MOCK_HISTORY.filter(
    (item) =>
      item.date.toLowerCase().includes(query.toLowerCase()) ||
      item.summary.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <header className="border-b border-slate-100 pb-2 text-sm dark:border-slate-800">
        <h1 className="text-base font-semibold text-slate-900 dark:text-slate-50">
          Session History
        </h1>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Revisit your past conversations and reflections to notice patterns
          over time.
        </p>
      </header>

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by date or topic (UI only)"
            className="w-full rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2 text-xs text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-indigo-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-50 dark:hover:border-indigo-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-500/40"
          />
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map((session) => (
          <article
            key={session.date + session.summary}
            className="rounded-2xl border border-slate-200/70 bg-white/90 p-3 text-xs shadow-sm shadow-slate-900/5 transition hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-200/40 dark:border-slate-700 dark:bg-slate-900/80 dark:hover:border-indigo-500/60 dark:hover:shadow-indigo-900/60"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {session.date}
            </p>
            <p className="mt-1 text-[13px] text-slate-900 dark:text-slate-50">
              {session.summary}
            </p>
          </article>
        ))}
        {filtered.length === 0 && (
          <p className="text-xs italic text-slate-500 dark:text-slate-500">
            No sessions match that search yet. In the full app, your history
            would sync securely with Supabase.
          </p>
        )}
      </div>
    </div>
  );
}


