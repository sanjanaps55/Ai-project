"use client";

import { CheckCircle2, Heart, Wind, MessageSquare } from "lucide-react";

export default function ActivitiesPage() {
  const activities = [
    { title: "Mood Tracker", icon: <Heart className="text-pink-400" />, desc: "How are you feeling?" },
    { title: "Gratitude Prompt", icon: <MessageSquare className="text-primary-purple" />, desc: "Write 3 things" },
    { title: "Breathing", icon: <Wind className="text-accent" />, desc: "Calm your mind" },
    { title: "Daily Check-in", icon: <CheckCircle2 className="text-secondary" />, desc: "Quick reflection" },
  ];

  return (
    <div className="space-y-8 py-6">
      <div className="flex flex-col items-center text-center">
        <h1 className="text-3xl font-bold mb-2">Activities</h1>
        <p className="text-white/40 text-sm">Quick tools for your mental wellbeing</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {activities.map((activity, idx) => (
          <button
            key={idx}
            className="glass-card flex flex-col items-start p-6 text-left hover:bg-white/5 transition-all group active:scale-[0.98]"
          >
            <div className="mb-4 p-3 rounded-2xl bg-white/5 transition-transform group-hover:scale-110">
              {activity.icon}
            </div>
            <h3 className="font-bold text-sm mb-1">{activity.title}</h3>
            <p className="text-[10px] text-white/40">{activity.desc}</p>
          </button>
        ))}
      </div>

      <div className="glass-card p-6 border-primary-purple/20 bg-primary-purple/5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold">Daily Challenge</h3>
          <span className="text-[10px] px-2 py-1 rounded-full bg-primary-purple/20 text-primary-purple font-bold">50 XP</span>
        </div>
        <p className="text-xs text-white/60 leading-relaxed mb-4">
          Take 5 minutes today to practice mindful breathing before your first meeting.
        </p>
        <button className="w-full py-3 rounded-xl bg-primary-purple text-bg-dark font-bold text-xs hover:brightness-110">
          Start Now
        </button>
      </div>
    </div>
  );
}
