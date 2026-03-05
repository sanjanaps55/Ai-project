"use client";

import { ChevronRight, Star, Target, Zap } from "lucide-react";

export default function PathPage() {
    const modules = [
        { title: "Build Self-Esteem", progress: 65, icon: <Star size={16} /> },
        { title: "Stress Management", progress: 30, icon: <Zap size={16} /> },
        { title: "Mindful Living", progress: 10, icon: <Target size={16} /> },
    ];

    return (
        <div className="space-y-10 py-6">
            <div className="flex flex-col items-center text-center">
                <h1 className="text-3xl font-bold mb-2">My Path</h1>
                <p className="text-white/40 text-sm">Your personalized wellness journey</p>
            </div>

            {/* Progress Ring Card */}
            <div className="relative glass-card p-8 flex flex-col items-center overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Zap size={100} className="text-primary-purple" />
                </div>

                <div className="relative h-40 w-40 flex items-center justify-center mb-6">
                    <svg className="h-full w-full rotate-[-90deg]">
                        <circle
                            cx="80"
                            cy="80"
                            r="70"
                            fill="transparent"
                            stroke="rgba(255,255,255,0.05)"
                            strokeWidth="12"
                        />
                        <circle
                            cx="80"
                            cy="80"
                            r="70"
                            fill="transparent"
                            stroke="#C7B8EA"
                            strokeWidth="12"
                            strokeDasharray="440"
                            strokeDashoffset="110"
                            strokeLinecap="round"
                            className="drop-shadow-[0_0_8px_rgba(199,184,234,0.5)]"
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-4xl font-bold">75%</span>
                        <span className="text-[10px] uppercase tracking-widest text-white/40">Overall</span>
                    </div>
                </div>

                <h3 className="font-bold text-lg mb-1">Step 4: Resilience</h3>
                <p className="text-xs text-white/40">3 modules remaining to next milestone</p>
            </div>

            <div className="space-y-4">
                {modules.map((module, idx) => (
                    <div key={idx} className="glass-card p-5 group hover:bg-white/5 transition-all cursor-pointer">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-white/5 text-primary-purple">
                                    {module.icon}
                                </div>
                                <h4 className="text-sm font-bold">{module.title}</h4>
                            </div>
                            <ChevronRight size={18} className="text-white/20 group-hover:text-primary-purple transition-colors" />
                        </div>

                        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-primary-purple to-accent rounded-full transition-all duration-1000"
                                style={{ width: `${module.progress}%` }}
                            />
                        </div>
                        <div className="flex justify-between mt-2">
                            <span className="text-[10px] text-white/30 font-bold uppercase tracking-widest">Progress</span>
                            <span className="text-[10px] text-primary-purple font-bold">{module.progress}%</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
