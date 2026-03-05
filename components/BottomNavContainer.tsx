"use client";

import { usePathname } from "next/navigation";
import { BottomNav } from "./BottomNav";

export const BottomNavContainer = () => {
    const pathname = usePathname();

    const isDashboardRoute =
        pathname?.startsWith("/chat") ||
        pathname?.startsWith("/explore") ||
        pathname?.startsWith("/path") ||
        pathname?.startsWith("/activities") ||
        pathname?.startsWith("/history");

    if (!isDashboardRoute) {
        return null;
    }

    return <BottomNav />;
};
