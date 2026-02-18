import Link from "next/link";
import { usePathname } from "next/navigation";
import { SIDEBAR_LINKS } from "@/constants";

export const Sidebar = () => {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 text-sm">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Dashboard
      </p>
      {SIDEBAR_LINKS.map((link) => {
        const isActive = pathname === link.path;
        return (
          <Link
            key={link.path}
            href={link.path}
            className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition ${
              isActive
                ? "bg-gradient-to-r from-sky-500/90 via-indigo-500/90 to-fuchsia-500/90 text-white shadow-sm shadow-indigo-500/40"
                : "text-slate-700 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/80 dark:hover:text-slate-50"
            }`}
          >
            <span>{link.name}</span>
          </Link>
        );
      })}
    </nav>
  );
};


