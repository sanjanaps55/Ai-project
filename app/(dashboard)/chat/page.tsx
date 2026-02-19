"use client";

import { useEffect, useState } from "react";
import { MOCK_MESSAGES } from "@/constants";
import { ChatBubble } from "@/components/ChatBubble";
import { TypingIndicator } from "@/components/TypingIndicator";

export default function ChatPage() {
  const [input, setInput] = useState("");
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const day = now.getDay();
  const daysFromMonday = (day + 6) % 7;
  const startOfWeek = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - daysFromMonday,
  );

  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const d = new Date(
      startOfWeek.getFullYear(),
      startOfWeek.getMonth(),
      startOfWeek.getDate() + index,
    );
    return d;
  });

  const dayLabels = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

  const formattedHeadlineDate = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="flex h-[60vh] flex-1 flex-col">
      {/* Calendar strip */}
      <div className="mb-4 rounded-2xl bg-[#FAF0E6] p-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {weekDays.map((date, index) => {
              const isToday =
                date.getFullYear() === now.getFullYear() &&
                date.getMonth() === now.getMonth() &&
                date.getDate() === now.getDate();

              return (
                <div
                  key={index}
                  className="flex flex-col items-center gap-1"
                >
                  <span
                    className={`text-[11px] font-medium ${isToday ? "text-[#7C6AAE]" : "text-[#9A9A9A]"
                      }`}
                  >
                    {dayLabels[index]}
                  </span>
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs ${isToday
                        ? "bg-[#7C6AAE] font-bold text-white shadow-md shadow-[#7C6AAE]/30"
                        : "text-[#2D2D2D]"
                      }`}
                  >
                    {date.getDate()}
                  </span>
                  {isToday && (
                    <span className="text-[10px] text-[#7C6AAE]">✓</span>
                  )}
                </div>
              );
            })}
          </div>

          <button className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E8D5C4] text-[#9A9A9A] transition hover:bg-[#F5E8D8]">
            ⚙
          </button>
        </div>

        <div className="flex flex-col items-center gap-2 pt-2">
          <span className="text-3xl">✿</span>
          <p className="text-[11px] font-medium uppercase tracking-widest text-[#9A9A9A]">
            {formattedHeadlineDate.toUpperCase()}
          </p>
          <p className="text-lg font-light text-[#2D2D2D]">
            What&apos;s on your mind?
          </p>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-2xl bg-[#FAF0E6] p-3 text-sm">
        <div className="flex-1 space-y-4 overflow-y-auto pb-3">
          {MOCK_MESSAGES.map((message, index) => (
            <ChatBubble
              key={index}
              role={message.role as "user" | "ai"}
              content={message.content}
            />
          ))}
          <div className="mt-1 flex justify-start">
            <TypingIndicator />
          </div>
        </div>
        <form
          className="mt-3 flex items-end gap-2 rounded-xl border border-[#E8D5C4] bg-[#FAF0E6] p-2"
          onSubmit={(e) => {
            e.preventDefault();
          }}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={1}
            className="max-h-32 flex-1 resize-none bg-transparent text-xs text-[#2D2D2D] outline-none placeholder:text-[#C5C0BA]"
            placeholder="Share what's on your mind..."
          />
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E8D5C4] bg-[#F5E8D8] text-[13px] text-[#2D2D2D] transition hover:bg-[#FAF0E6]"
          >
            🎤
          </button>
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#7C6AAE] via-[#D4A5A5] to-[#A8C5C0] px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-[#1A1A1A]/15 transition hover:brightness-110"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
