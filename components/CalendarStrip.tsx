"use client";

import { useEffect, useState } from "react";

export const CalendarStrip = () => {
    const [days, setDays] = useState<{ day: string; date: number; active: boolean }[]>([]);

    useEffect(() => {
        const today = new Date();
        const generatedDays = [];
        const dayNames = ["S", "M", "T", "W", "T", "F", "S"];

        for (let i = -3; i <= 3; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            generatedDays.push({
                day: dayNames[date.getDay()],
                date: date.getDate(),
                active: i === 0 // true only for today
            });
        }
        setDays(generatedDays);
    }, []);

    return (
        <div className="flex items-center justify-center w-full mt-0 mb-1">
            <div className="flex items-center justify-between w-full max-w-[280px] px-2 py-1">
                {days.map((item, idx) => (
                    <div key={idx} className="flex flex-col items-center gap-1">
                        <span className={`text-[8px] font-bold uppercase tracking-wider ${item.active ? "text-primary-purple" : "text-white/30"}`}>
                            {item.day}
                        </span>
                        <div
                            className={`flex h-[22px] w-[22px] items-center justify-center rounded-full text-[9px] font-bold transition-all duration-300 ${item.active
                                    ? "bg-gradient-to-tr from-primary-purple to-secondary text-[#0F0F1B] shadow-[0_2px_10px_rgba(199,184,234,0.3)] scale-110"
                                    : "text-white/50 hover:bg-white/5"
                                }`}
                        >
                            {item.date}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
