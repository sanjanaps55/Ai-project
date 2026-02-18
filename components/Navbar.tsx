"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_NAME } from "@/constants";
import { ThemeToggle } from "@/components/ThemeToggle";

export const Navbar = () => {
  const pathname = usePathname();

  const isDashboardRoute =
    pathname?.startsWith("/chat") ||
    pathname?.startsWith("/assessments") ||
    pathname?.startsWith("/history");

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-slate-50/70 backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-fuchsia-500 text-white shadow-md">
            <span className="text-xl font-semibold">M</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-50">
              {APP_NAME}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Your Intelligent Emotional Companion
            </span>
          </div>
        </Link>

        <nav className="flex items-center gap-4">
          {!isDashboardRoute && (
            <Link
              href="/auth"
              className="hidden rounded-full border border-slate-300/70 bg-white/70 px-4 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50/70 hover:text-indigo-900 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:border-indigo-500 dark:hover:bg-slate-800"
            >
              Sign in
            </Link>
          )}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
};


