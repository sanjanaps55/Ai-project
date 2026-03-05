"use client";

import { ReactNode, useState } from "react";
import { TopBar } from "@/components/TopBar";
import { SidebarDrawer } from "@/components/SidebarDrawer";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <div className="relative flex min-h-screen flex-col bg-[#0F0F1B]">
      <SidebarDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />

      <TopBar onMenuClick={() => setIsDrawerOpen(true)} />

      <main className="flex-1 pb-24 px-6 safe-bottom">
        {children}
      </main>
    </div>
  );
}
