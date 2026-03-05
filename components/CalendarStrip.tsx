"use client";

export const CalendarStrip = () => {
    const days = [
        { day: "M", date: 16 },
        { day: "T", date: 17 },
        { day: "W", date: 18, active: true },
        { day: "T", date: 19 },
        { day: "F", date: 20 },
        { day: "S", date: 21 },
        { day: "S", date: 22 },
    ];

    return (
        <div className="flex items-center justify-between w-full max-w-sm px-4 py-2">
            {days.map((item, idx) => (
                <div key={idx} className="flex flex-col items-center gap-1">
                    <span className="text-[10px] font-medium opacity-40 uppercase tracking-tighter">
                        {item.day}
                    </span>
                    <div
                        className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${item.active
                                ? "bg-primary-purple text-[#0F0F1B] shadow-[0_0_15px_#C7B8EA]"
                                : "border border-white/10 text-white/60 hover:border-white/30"
                            }`}
                    >
                        {item.date}
                    </div>
                </div>
            ))}
        </div>
    );
};
