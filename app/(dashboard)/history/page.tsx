"use client";

import { Calendar, Clock, MessageCircle } from "lucide-react";

export default function HistoryPage() {
  const historyItems = [
    {
      date: "Today", items: [
        { title: "Morning Reflection", time: "9:00 AM", type: "Chat" },
        { title: "Stress Management", time: "2:30 PM", type: "Path" }
      ]
    },
    {
      date: "Yesterday", items: [
        { title: "Anxiety Relief", time: "4:30 PM", type: "Chat" },
        { title: "Mood Check-in", time: "10:15 AM", type: "Mood" }
      ]
    },
    {
      date: "Mar 3, 2026", items: [
        { title: "Deep Sleep Meditation", time: "11:00 PM", type: "Activity" }
      ]
    }
  ];

  return (
    <div className="space-y-8 py-6">
      <div className="flex flex-col items-center text-center">
        <h1 className="text-3xl font-bold mb-2">History</h1>
        <p className="text-white/40 text-sm">Review your journey and progress</p>
      </div>

      <div className="space-y-8">
        {historyItems.map((group, groupIdx) => (
          <div key={groupIdx} className="space-y-4">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 pl-4 border-l border-white/10">
              {group.date}
            </h3>
            <div className="space-y-3">
              {group.items.map((item, idx) => (
                <div key={idx} className="glass-card p-4 hover:bg-white/5 transition-colors cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-xl bg-white/5 text-primary-purple">
                        <MessageCircle size={18} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold">{item.title}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock size={10} className="text-white/30" />
                          <span className="text-[10px] text-white/40">{item.time}</span>
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-1 rounded-full bg-white/5 text-white/40 border border-white/10">
                      {item.type}
                    </span>
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
