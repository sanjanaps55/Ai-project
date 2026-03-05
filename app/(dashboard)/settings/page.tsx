"use client";

import { User, Bell, LifeBuoy, ShieldCheck, LogOut, ChevronRight, Moon, Globe } from "lucide-react";

interface SettingsItem {
    icon: React.ReactNode;
    label: string;
    value?: string;
}

interface SettingsSection {
    title: string;
    items: SettingsItem[];
}

export default function SettingsPage() {
    const sections: SettingsSection[] = [
        {
            title: "Account",
            items: [
                { icon: <User size={18} />, label: "Edit Profile", value: "Denis" },
                { icon: <Bell size={18} />, label: "Notifications", value: "On" },
            ]
        },
        {
            title: "Preferences",
            items: [
                { icon: <Moon size={18} />, label: "Theme", value: "Dark" },
                { icon: <Globe size={18} />, label: "Language", value: "English" },
            ]
        },
        {
            title: "Support & Legal",
            items: [
                { icon: <LifeBuoy size={18} />, label: "Help & Support" },
                { icon: <ShieldCheck size={18} />, label: "Privacy & Data" },
            ]
        }
    ];

    return (
        <div className="space-y-8 py-6">
            <div className="flex flex-col items-center text-center">
                <h1 className="text-3xl font-bold mb-2">Settings</h1>
                <p className="text-white/40 text-sm">Manage your profile and preferences</p>
            </div>

            <div className="space-y-8">
                {sections.map((section, idx) => (
                    <div key={idx} className="space-y-4">
                        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 px-4">
                            {section.title}
                        </h3>
                        <div className="glass-morphism rounded-[32px] overflow-hidden">
                            {section.items.map((item, itemIdx) => (
                                <button
                                    key={itemIdx}
                                    className={`w-full flex items-center justify-between p-5 hover:bg-white/5 transition-colors ${itemIdx !== section.items.length - 1 ? "border-b border-white/5" : ""
                                        }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 rounded-xl bg-white/5 text-primary-purple">
                                            {item.icon}
                                        </div>
                                        <span className="text-sm font-semibold">{item.label}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {item.value && <span className="text-xs text-white/30 font-medium">{item.value}</span>}
                                        <ChevronRight size={16} className="text-white/20" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                ))}

                <button className="w-full glass-morphism rounded-[32px] p-5 flex items-center justify-center gap-3 text-red-400 font-bold hover:bg-red-400/10 transition-all border-red-400/10">
                    <LogOut size={18} />
                    <span className="text-sm">Log Out</span>
                </button>
            </div>

            <div className="text-center py-6">
                <p className="text-[10px] text-white/10 uppercase tracking-[0.3em]">Nova v1.0.4</p>
            </div>
        </div>
    );
}
