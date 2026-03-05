"use client";

import { X, MessageSquare, Plus } from "lucide-react";

interface SidebarDrawerProps {
    isOpen: boolean;
    onClose: () => void;
}

export const SidebarDrawer = ({ isOpen, onClose }: SidebarDrawerProps) => {
    const conversations = [
        { title: "Morning Reflection", time: "Today, 9:00 AM" },
        { title: "Dealing with Anxiety", time: "Yesterday, 4:30 PM" },
        { title: "Relationship Advice", time: "Mar 3, 2026" },
    ];

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
                        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full">
                            <X size={20} className="text-white/60" />
                        </button>
                    </div>

                    <button className="flex items-center gap-2 w-full p-4 rounded-2xl bg-primary-purple text-bg-dark font-bold mb-8 hover:brightness-110 active:scale-[0.98] transition-all">
                        <Plus size={18} />
                        <span>New Chat</span>
                    </button>

                    <div className="flex-1 overflow-y-auto space-y-3">
                        {conversations.map((chat, idx) => (
                            <button
                                key={idx}
                                className="w-full text-left p-4 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 transition-colors group"
                            >
                                <div className="flex items-start gap-3">
                                    <MessageSquare size={16} className="mt-1 text-primary-purple opacity-70 group-hover:opacity-100" />
                                    <div>
                                        <p className="text-sm font-semibold truncate">{chat.title}</p>
                                        <p className="text-[10px] text-white/40 mt-1">{chat.time}</p>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>

                    <div className="mt-auto pt-6 border-t border-white/10">
                        <div className="flex items-center gap-3 p-2">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-primary-purple to-secondary" />
                            <div>
                                <p className="text-sm font-bold">Denis</p>
                                <p className="text-[10px] text-white/40">Premium Member</p>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
};
