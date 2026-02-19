"use client"
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SIDEBAR_LINKS } from "@/constants";

export const Sidebar = () => {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 text-sm">
      {SIDEBAR_LINKS.map((link) => {
        const isActive = pathname === link.path;
        return (
          <Link
            key={link.path}
            href={link.path}
            className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition ${
              isActive
                ? "bg-gradient-to-r from-[#8B6BB5] via-[#D4A5A5] to-[#A8C5C0] text-white shadow-sm shadow-[#1A1A1A]/15"
                : "text-[#2D2D2D] hover:bg-[#E0DEDA] hover:text-[#2D2D2D] dark:text-[#EDE8E0] dark:hover:bg-[#1A1A1A]"
            }`}
          >
            <span>{link.name}</span>
          </Link>
        );
      })}
    </nav>
  );
};


