"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { name: "Chat", path: "/chat" },
  { name: "Explore paths", path: "/paths" },
  { name: "Activities", path: "/activities" },
  { name: "History", path: "/history" },
];

export const BottomNav = () => {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E8D5C4]/40 bg-[#FAF0E6]">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-2.5 text-xs">
        {NAV_LINKS.map((link) => {
          const isActive =
            pathname === link.path ||
            (link.path !== "/" && pathname?.startsWith(link.path));

          return (
            <Link
              key={link.path}
              href={link.path}
              className={`flex flex-1 flex-col items-center gap-0.5 ${isActive ? "text-white" : "text-[#9A9A9A]"
                }`}
            >
              <span
                className={`inline-flex min-w-[64px] items-center justify-center rounded-full px-3 py-1 text-[11px] font-medium ${isActive
                    ? "bg-gradient-to-r from-[#7C6AAE] via-[#D4A5A5] to-[#A8C5C0] shadow-sm shadow-[#1A1A1A]/15"
                    : "bg-[#F5E8D8] text-[#2D2D2D]"
                  }`}
              >
                {link.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
