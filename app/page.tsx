import Link from "next/link";
import { APP_NAME, TAGLINE } from "@/constants";

export default function Home() {
  return (
    <div className="page-container">
      <section className="glass-panel relative overflow-hidden px-6 py-10 sm:px-10 sm:py-14">
        <div className="pointer-events-none absolute inset-0 opacity-70 mix-blend-soft-light">
          <div className="absolute -left-32 top-0 h-56 w-56 rounded-full bg-sky-300/40 blur-3xl dark:bg-sky-500/40" />
          <div className="absolute -right-16 bottom-0 h-64 w-64 rounded-full bg-fuchsia-300/40 blur-3xl dark:bg-fuchsia-500/40" />
        </div>

        <div className="relative grid gap-10 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:items-center">
          <div>
            <p className="mb-3 inline-flex items-center rounded-full bg-slate-900/5 px-3 py-1 text-xs font-medium text-slate-700 backdrop-blur dark:bg-slate-50/5 dark:text-slate-200">
              Gentle AI-powered emotional support
            </p>
            <h1 className="text-balance text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl md:text-5xl dark:text-slate-50">
              {APP_NAME}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-700 md:text-base dark:text-slate-300">
              {TAGLINE}. A safe, always-available space to reflect, process your
              emotions, and practice healthier patterns—designed to complement
              human therapy, not replace it.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/chat"
                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-sky-500 via-indigo-500 to-fuchsia-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/40 transition hover:from-sky-600 hover:via-indigo-600 hover:to-fuchsia-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              >
                Get started
              </Link>
              <Link
                href="/auth"
                className="inline-flex items-center justify-center rounded-full border border-slate-200/80 bg-white/80 px-5 py-2.5 text-sm font-medium text-slate-800 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50/80 hover:text-indigo-900 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:hover:border-indigo-500 dark:hover:bg-slate-800"
              >
                Login
              </Link>
            </div>

            <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
              Frontend only preview — AI and account features will connect to
              Supabase in a future update.
            </p>
          </div>

          <div className="glass-panel relative flex h-full flex-col justify-between bg-gradient-to-br from-sky-100/70 via-indigo-100/40 to-slate-50/60 p-5 text-xs dark:from-slate-900/80 dark:via-slate-900/60 dark:to-slate-950/60">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300">
              Preview session
            </p>
            <div className="space-y-3">
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-2xl bg-white/90 px-3 py-2 text-[11px] text-slate-900 shadow-sm dark:bg-slate-800/90 dark:text-slate-50">
                  Hi, I&apos;m your AI companion. What would you like to share
                  today?
                </div>
              </div>
              <div className="flex justify-end">
                <div className="max-w-[80%] rounded-2xl bg-indigo-500 px-3 py-2 text-[11px] text-white shadow-sm shadow-indigo-500/40">
                  I&apos;ve been feeling really overwhelmed and don&apos;t know
                  where to start.
                </div>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="inline-flex h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.2s]" />
                <span className="inline-flex h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.1s]" />
                <span className="inline-flex h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
                <span>MindCare AI is reflecting…</span>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-2 text-[11px] text-slate-600 dark:text-slate-300">
              <div className="rounded-xl bg-white/80 p-3 shadow-sm dark:bg-slate-900/80">
                <p className="font-semibold">Check-ins</p>
                <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                  Gentle prompts for daily emotional awareness.
                </p>
              </div>
              <div className="rounded-xl bg-white/80 p-3 shadow-sm dark:bg-slate-900/80">
                <p className="font-semibold">Assessments</p>
                <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                  Structured reflections for deeper insight.
                </p>
              </div>
              <div className="rounded-xl bg-white/80 p-3 shadow-sm dark:bg-slate-900/80">
                <p className="font-semibold">History</p>
                <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
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
