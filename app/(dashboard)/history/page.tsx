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
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search..."
            className="w-full rounded-xl border border-[#E8D5C4] bg-[#FAF0E6] px-3 py-2 text-xs text-[#2D2D2D] shadow-sm outline-none transition placeholder:text-[#C5C0BA] hover:border-[#7C6AAE] focus:border-[#7C6AAE] focus:ring-2 focus:ring-[#D4A5A5]/60"
          />
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map((session) => (
          <article
            key={session.date + session.summary}
            className="rounded-2xl border border-[#E8D5C4] bg-[#FAF0E6] p-3 text-xs transition hover:border-[#7C6AAE] hover:bg-white/80"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9A9A9A]">
              {session.date}
            </p>
            <p className="mt-1 text-[13px] text-[#2D2D2D]">
              {session.summary}
            </p>
          </article>
        ))}
        {filtered.length === 0 && (
          <p className="text-xs italic text-[#9A9A9A]">
            No sessions found.
          </p>
        )}
      </div>
    </div>
  );
}
