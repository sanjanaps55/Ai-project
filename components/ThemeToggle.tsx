"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export const ThemeToggle = () => {
  const { theme, setTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const currentTheme = theme === "system" ? systemTheme : theme;
  const isDark = currentTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="relative flex h-9 w-16 items-center rounded-full bg-slate-200 px-1 transition-colors hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600"
      aria-label="Toggle theme"
    >
      <span
        className={`inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-semibold text-slate-700 shadow-sm transition-transform dark:bg-slate-900 dark:text-slate-100 ${
          isDark ? "translate-x-7" : ""
        }`}
      >
        {isDark ? "🌙" : "☀️"}
      </span>
    </button>
  );
};


