import type { ReactNode } from "react";
import { Sidebar } from "@/components/Sidebar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="page-container">
      <div className="glass-panel flex min-h-[60vh] flex-1 flex-col overflow-hidden md:flex-row">
        <aside className="border-b border-slate-200/70 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/80 md:w-64 md:border-b-0 md:border-r">
          <Sidebar />
        </aside>
        <section className="flex-1 overflow-hidden border-t border-slate-200/60 bg-gradient-to-br from-sky-50/80 via-indigo-50/60 to-slate-50/80 p-4 dark:border-slate-800/80 dark:from-slate-950/80 dark:via-slate-900/80 dark:to-slate-950/80 md:border-t-0 md:p-6">
          <div className="h-full overflow-y-auto rounded-2xl bg-white/80 p-4 shadow-inner shadow-slate-900/5 backdrop-blur dark:bg-slate-950/70">
            {children}
          </div>
        </section>
      </div>
    </div>
  );
}


