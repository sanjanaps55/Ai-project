import Link from "next/link";
import { APP_NAME, TAGLINE } from "@/constants";

export default function Home() {
  return (
    <div className="page-container">
      <section className="glass-panel relative overflow-hidden px-6 py-10 sm:px-10 sm:py-14">
        <div className="pointer-events-none absolute inset-0 opacity-70 mix-blend-soft-light">
          <div className="absolute -left-32 top-0 h-56 w-56 rounded-full bg-[#D4A5A5]/50 blur-3xl" />
          <div className="absolute -right-16 bottom-0 h-64 w-64 rounded-full bg-[#A8C5C0]/50 blur-3xl" />
        </div>

        <div className="relative grid gap-10 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:items-center">
          <div>
            <p className="mb-3 inline-flex items-center rounded-full bg-[#F5E8D8] px-3 py-1 text-xs font-medium text-[#2D2D2D] backdrop-blur">
              Gentle AI-powered emotional support
            </p>
            <h1 className="text-balance text-3xl font-semibold tracking-tight text-[#2D2D2D] sm:text-4xl md:text-5xl">
              {APP_NAME}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#9A9A9A] md:text-base">
              {TAGLINE}. A safe, always-available space to reflect, process your
              emotions, and practice healthier patterns—designed to complement
              human therapy, not replace it.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/chat"
                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#7C6AAE] via-[#D4A5A5] to-[#A8C5C0] px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#1A1A1A]/15 transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C6AAE]"
              >
                Get started
              </Link>
              <Link
                href="/auth"
                className="inline-flex items-center justify-center rounded-full border border-[#E8D5C4] bg-[#FAF0E6] px-5 py-2.5 text-sm font-medium text-[#2D2D2D] shadow-sm transition hover:border-[#7C6AAE] hover:bg-white"
              >
                Login
              </Link>
            </div>

            <p className="mt-4 text-xs text-[#9A9A9A]">
              Frontend only preview — AI and account features will connect to
              Supabase in a future update.
            </p>
          </div>

          <div className="glass-panel relative flex h-full flex-col justify-between bg-[#FAF0E6] p-5 text-xs">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#2D2D2D]">
              Preview session
            </p>
            <div className="space-y-3">
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-2xl bg-[#F5E8D8] px-3 py-2 text-[11px] text-[#2D2D2D] shadow-sm">
                  Hi, I&apos;m your AI companion. What would you like to share
                  today?
                </div>
              </div>
              <div className="flex justify-end">
                <div className="max-w-[80%] rounded-2xl bg-gradient-to-r from-[#7C6AAE] via-[#D4A5A5] to-[#A8C5C0] px-3 py-2 text-[11px] text-white shadow-sm shadow-[#1A1A1A]/15">
                  I&apos;ve been feeling really overwhelmed and don&apos;t know
                  where to start.
                </div>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <span className="inline-flex h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.2s]" />
                <span className="inline-flex h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.1s]" />
                <span className="inline-flex h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
                <span>Nova is reflecting…</span>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-2 text-[11px] text-[#9A9A9A]">
              <div className="rounded-xl bg-[#F5E8D8] p-3 shadow-sm">
                <p className="font-semibold">Check-ins</p>
                <p className="mt-1 text-[10px] text-[#9A9A9A]">
                  Gentle prompts for daily emotional awareness.
                </p>
              </div>
              <div className="rounded-xl bg-[#F5E8D8] p-3 shadow-sm">
                <p className="font-semibold">Assessments</p>
                <p className="mt-1 text-[10px] text-[#9A9A9A]">
                  Structured reflections for deeper insight.
                </p>
              </div>
              <div className="rounded-xl bg-[#F5E8D8] p-3 shadow-sm">
                <p className="font-semibold">History</p>
                <p className="mt-1 text-[10px] text-[#9A9A9A]">
                  Track your emotional patterns over time.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
