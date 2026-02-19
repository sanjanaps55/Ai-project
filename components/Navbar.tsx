"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_NAME } from "@/constants";

export const Navbar = () => {
  const pathname = usePathname();

  const isDashboardRoute =
    pathname?.startsWith("/chat") ||
    pathname?.startsWith("/paths") ||
    pathname?.startsWith("/activities") ||
    pathname?.startsWith("/history");

  return (
    <header className="sticky top-0 z-40 border-b border-[#E8D5C4]/40 bg-[#FAF0E6]">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center">
          <span className="text-lg font-semibold tracking-tight text-[#2D2D2D]">
            {APP_NAME}
          </span>
        </Link>

        <nav className="flex items-center gap-4">
          {!isDashboardRoute && (
            <Link
              href="/auth"
              className="rounded-full border border-[#E8D5C4] bg-[#FAF0E6] px-4 py-1.5 text-sm font-medium text-[#2D2D2D] shadow-sm transition hover:border-[#7C6AAE] hover:bg-white"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
};
