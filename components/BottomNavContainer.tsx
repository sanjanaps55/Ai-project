"use client";

import { usePathname } from "next/navigation";
import { BottomNav } from "./BottomNav";

export const BottomNavContainer = () => {
    const pathname = usePathname();

    const isDashboardRoute =
        pathname?.startsWith("/chat") ||
        pathname?.startsWith("/history") ||
        pathname?.startsWith("/insights") ||
        pathname?.startsWith("/music");

    if (!isDashboardRoute) {
        return null;
    }

    return <BottomNav />;
};
