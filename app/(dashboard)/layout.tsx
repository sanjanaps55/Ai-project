import type { ReactNode } from "react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="page-container">
      <div className="glass-panel flex min-h-[60vh] flex-1 flex-col overflow-hidden">
        <section className="flex-1 overflow-hidden p-4 md:p-6">
          <div className="h-full overflow-y-auto rounded-2xl bg-[#FAF0E6] p-4">
            {children}
          </div>
        </section>
      </div>
    </div>
  );
}
