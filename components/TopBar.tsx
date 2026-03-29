"use client";

import { CalendarStrip } from "./CalendarStrip";
import { Settings, Menu, Flame, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";

export const TopBar = ({ onMenuClick }: { onMenuClick?: () => void }) => {
    const pathname = usePathname();
    const isChatPage = pathname === "/chat";
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [userName, setUserName] = useState<string>("User");

    useEffect(() => {
        const supabase = createClient();
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) {
                setAvatarUrl(user.user_metadata?.avatar_url || null);
                const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || "User";
                setUserName(fullName.split(' ')[0]);
            }
        });
    }, []);

    return (
        <div className="relative z-40 w-full px-6 pt-4 pb-2 flex flex-col gap-4 bg-[#0F0F1B] border-b border-white/5">
            <div className="flex items-center justify-between">
                <button
                    onClick={onMenuClick}
                    className="p-2 rounded-full border border-white/10 bg-white/5 active:scale-95 transition-transform"
                    suppressHydrationWarning={true}
                >
                    <Menu size={18} className="text-white/80" />
                </button>



                <div className="flex items-center gap-2">
                    <Link
                        href="/profile"
                        className="p-1 rounded-full border border-white/10 bg-white/5 active:scale-95 transition-transform overflow-hidden flex items-center justify-center w-[36px] h-[36px]"
                        suppressHydrationWarning={true}
                    >
                        {avatarUrl ? (
                            <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover rounded-full" referrerPolicy="no-referrer" />
                        ) : (
                            <User size={18} className="text-white/80" />
                        )}
                    </Link>
                    <Link
                        href="/settings"
                        className="p-2 rounded-full border border-white/10 bg-white/5 active:scale-95 transition-transform"
                        suppressHydrationWarning={true}
                    >
                        <Settings size={18} className="text-white/80" />
                    </Link>
                </div>
            </div>

            {isChatPage && (
                <div className="flex flex-col items-center animate-in fade-in slide-in-from-top-2 duration-500 pb-2">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-medium text-white/40 uppercase tracking-widest">Good afternoon,</span>
                        <span className="text-[10px] font-bold text-white uppercase tracking-widest">{userName}</span>
                    </div>
                    <CalendarStrip />
                </div>
            )}
        </div>
    );
};
