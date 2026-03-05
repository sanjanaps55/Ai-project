"use client";

import { Search, Play, BookOpen, PenTool } from "lucide-react";

export default function ExplorePage() {
  const sections = [
    { title: "Journaling Prompts", icon: <PenTool size={18} />, color: "from-blue-500/20", items: ["Daily Reflection", "Gratitude Journal", "Morning Intention"] },
    { title: "Meditation", icon: <Play size={18} />, color: "from-purple-500/20", items: ["Deep Calm (5m)", "Anxiety Relief (10m)", "Quick Reset"] },
    { title: "Articles", icon: <BookOpen size={18} />, color: "from-teal-500/20", items: ["Science of Sleep", "Boundaries 101", "Self-Care Basics"] },
  ];

  return (
    <div className="space-y-10 py-6">
      <div className="flex flex-col items-center text-center">
        <h1 className="text-3xl font-bold mb-2">Explore</h1>
        <p className="text-white/40 text-sm">Discover tools and resources for growth</p>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <Search size={18} className="text-white/20" />
        </div>
        <input
          type="text"
          placeholder="Search for articles, prompts..."
          className="w-full glass-morphism rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-primary-purple/40 transition-all shadow-none"
        />
      </div>

      <div className="space-y-8">
        {sections.map((section, idx) => (
          <div key={idx} className="space-y-4">
            <div className="flex items-center gap-2 px-2">
              <div className="p-1.5 rounded-lg bg-white/5 text-primary-purple">
                {section.icon}
              </div>
              <h3 className="font-bold text-sm uppercase tracking-widest text-white/50">{section.title}</h3>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {section.items.map((item, itemIdx) => (
                <div
                  key={itemIdx}
                  className={`glass-card p-6 flex items-center justify-between group hover:bg-white/5 transition-all cursor-pointer bg-gradient-to-br ${section.color} via-transparent to-transparent`}
                >
                  <span className="text-sm font-semibold">{item}</span>
                  <div className="p-2 rounded-full border border-white/10 group-hover:bg-primary-purple group-hover:text-bg-dark transition-all">
                    <Play size={14} fill="currentColor" stroke="none" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
