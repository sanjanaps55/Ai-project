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
      className="relative flex h-9 w-16 items-center rounded-full bg-[#F5E8D8] px-1 transition-colors hover:bg-[#E8D5C4] dark:bg-[#1A1A1A] dark:hover:bg-black"
      aria-label="Toggle theme"
    >
      <span
        className={`inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#FAF0E6] text-xs font-semibold text-[#2D2D2D] shadow-sm transition-transform dark:bg-[#1A1A1A] dark:text-[#EDE8E0] ${isDark ? "translate-x-7" : ""
          }`}
      >
        {isDark ? "🌙" : "☀️"}
      </span>
    </button>
  );
};
