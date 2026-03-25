"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_NAME } from "@/constants";

export const Navbar = () => {
  const pathname = usePathname();

  const isDashboardRoute =
    pathname?.startsWith("/chat") ||
    pathname?.startsWith("/explore") ||
    pathname?.startsWith("/path") ||
    pathname?.startsWith("/activities") ||
    pathname?.startsWith("/history");

  return (
    <header className="sticky top-0 z-40 border-b border-[#E8E4DF]/50 bg-[#F5F2ED]/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center">
          <span className="text-xl font-bold tracking-tight text-[#3A3A3A]">
            {APP_NAME}
          </span>
        </Link>

        <nav className="flex items-center gap-4">
          {!isDashboardRoute && (
            <Link
              href="/login"
              className="rounded-full border border-[#E8E4DF] bg-[#F9F7F4] px-5 py-2 text-sm font-medium text-[#3A3A3A] shadow-sm transition hover:border-[#706299] hover:bg-white"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
};
