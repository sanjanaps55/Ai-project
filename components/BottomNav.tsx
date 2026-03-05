"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { name: "Chat", path: "/chat", icon: "💬" },
  { name: "Explore", path: "/explore", icon: "🧭" },
  { name: "Path", path: "/path", icon: "✨" },
  { name: "Activities", path: "/activities", icon: "🧘" },
  { name: "History", path: "/history", icon: "📖" },
];

export const BottomNav = () => {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4 pt-1">
      <div className="glass-morphism mx-auto flex max-w-md items-center justify-around rounded-[24px] px-1 py-1">
        {NAV_LINKS.map((link) => {
          const isActive = pathname === link.path || (link.path !== "/" && pathname?.startsWith(link.path));

          return (
            <Link
              key={link.path}
              href={link.path}
              className={`relative flex flex-col items-center justify-center p-2 transition-all duration-300 ${isActive ? "scale-105" : "opacity-50 hover:opacity-100"
                }`}
            >
              <span className="text-lg mb-0.5">{link.icon}</span>
              <span className={`text-[9px] font-medium tracking-wide ${isActive ? "text-primary-purple" : "text-white/60"}`}>
                {link.name}
              </span>
              {isActive && (
                <div className="absolute -bottom-0.5 h-0.5 w-0.5 rounded-full bg-primary-purple shadow-[0_0_6px_#C7B8EA]" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
