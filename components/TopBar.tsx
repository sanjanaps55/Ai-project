"use client";

import { CalendarStrip } from "./CalendarStrip";
import { Settings, Menu, Flame } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export const TopBar = ({ onMenuClick }: { onMenuClick?: () => void }) => {
    const pathname = usePathname();
    const isChatPage = pathname === "/chat";

    return (
        <div className="sticky top-0 z-40 w-full px-6 pt-4 pb-2 flex flex-col gap-4 bg-[#0F0F1B]/80 backdrop-blur-lg">
            <div className="flex items-center justify-between">
                <button
                    onClick={onMenuClick}
                    className="p-2 rounded-full border border-white/10 bg-white/5 active:scale-95 transition-transform"
                >
                    <Menu size={18} className="text-white/80" />
                </button>

                <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-primary-purple/30 bg-primary-purple/5 shadow-[0_0_15px_rgba(199,184,234,0.1)]">
                    <Flame size={14} className="text-orange-400 fill-orange-400" />
                    <span className="text-[10px] font-bold text-primary-purple tracking-wide whitespace-nowrap">
                        3 day streak
                    </span>
                </div>

                <Link
                    href="/settings"
                    className="p-2 rounded-full border border-white/10 bg-white/5 active:scale-95 transition-transform"
                >
                    <Settings size={18} className="text-white/80" />
                </Link>
            </div>

            {isChatPage && (
                <div className="flex flex-col items-center animate-in fade-in slide-in-from-top-2 duration-500">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="text-[10px] font-medium text-white/40 uppercase tracking-widest">Good afternoon,</span>
                        <span className="text-[10px] font-bold text-white uppercase tracking-widest">Denis</span>
                    </div>
                    <CalendarStrip />
                </div>
            )}
        </div>
    );
};
