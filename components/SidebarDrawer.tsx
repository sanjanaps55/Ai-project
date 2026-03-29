"use client";

import { X, MessageSquare, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

interface Conversation {
    id: string;
    title: string;
    updated_at: string;
}

interface SidebarDrawerProps {
    isOpen: boolean;
    onClose: () => void;
}

export const SidebarDrawer = ({ isOpen, onClose }: SidebarDrawerProps) => {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(false);
    const [userName, setUserName] = useState("User");
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        if (isOpen) {
            loadConversations();
            loadUserInfo();
        }
    }, [isOpen]);

    async function loadConversations() {
        setLoading(true);
        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setConversations([]);
                return;
            }
            const { data, error } = await supabase
                .from("conversations")
                .select("id, title, updated_at")
                .eq("user_id", user.id)
                .order("updated_at", { ascending: false });

            if (!error && data) {
                setConversations(data);
            }
        } catch (err) {
            console.error("Error loading conversations:", err);
        } finally {
            setLoading(false);
        }
    }

    async function loadUserInfo() {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            setUserName(user.user_metadata?.full_name || user.email?.split("@")[0] || "User");
            setAvatarUrl(user.user_metadata?.avatar_url || null);
        }
    }

    function handleNewChat() {
        onClose();
        router.push("/chat");
    }

    function handleSelectConversation(id: string) {
        onClose();
        router.push(`/chat?id=${id}`);
    }

    async function handleDeleteConversation(e: React.MouseEvent, id: string) {
        e.stopPropagation();
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        await supabase.from("conversations").delete().eq("id", id).eq("user_id", user.id);
        setConversations((prev) => prev.filter((c) => c.id !== id));
    }

    function formatTime(dateStr: string) {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return "Today, " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        } else if (diffDays === 1) {
            return "Yesterday";
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        } else {
            return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
        }
    }

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                    }`}
                onClick={onClose}
            />

            {/* Drawer */}
            <aside
                className={`fixed top-0 left-0 z-[70] h-full w-[280px] glass-morphism border-r border-white/10 transition-transform duration-300 ease-in-out ${isOpen ? "translate-x-0" : "-translate-x-full"
                    }`}
            >
                <div className="flex flex-col h-full p-6">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-xl font-bold">Conversations</h3>
                        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full" suppressHydrationWarning={true}>
                            <X size={20} className="text-white/60" />
                        </button>
                    </div>

                    <button
                        onClick={handleNewChat}
                        className="flex items-center gap-2 w-full p-4 rounded-2xl bg-primary-purple text-bg-dark font-bold mb-8 hover:brightness-110 active:scale-[0.98] transition-all"
                        suppressHydrationWarning={true}
                    >
                        <Plus size={18} />
                        <span>New Chat</span>
                    </button>

                    <div className="flex-1 overflow-y-auto space-y-3">
                        {loading ? (
                            <div className="text-white/30 text-sm text-center py-4">Loading...</div>
                        ) : conversations.length === 0 ? (
                            <div className="text-white/30 text-sm text-center py-4">
                                No conversations yet. Start a new chat!
                            </div>
                        ) : (
                            conversations.map((chat) => (
                                <div
                                    key={chat.id}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => handleSelectConversation(chat.id)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                            e.preventDefault();
                                            handleSelectConversation(chat.id);
                                        }
                                    }}
                                    className="w-full text-left p-4 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 transition-colors group cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary-purple/50"
                                    suppressHydrationWarning={true}
                                >
                                    <div className="flex items-start gap-3">
                                        <MessageSquare size={16} className="mt-1 text-primary-purple opacity-70 group-hover:opacity-100 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold truncate">{chat.title}</p>
                                            <p className="text-[10px] text-white/40 mt-1">{formatTime(chat.updated_at)}</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={(e) => handleDeleteConversation(e, chat.id)}
                                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded-full transition-all shrink-0"
                                            title="Delete conversation"
                                            suppressHydrationWarning={true}
                                        >
                                            <Trash2 size={12} className="text-red-400" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="mt-auto pt-6 border-t border-white/10">
                        <div className="flex items-center gap-3 p-2">
                            {avatarUrl ? (
                                <img src={avatarUrl} alt="Profile" className="h-10 w-10 rounded-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                                <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-primary-purple to-secondary" />
                            )}
                            <div>
                                <p className="text-sm font-bold">{userName}</p>
                                <p className="text-[10px] text-white/40">Nova User</p>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
};
