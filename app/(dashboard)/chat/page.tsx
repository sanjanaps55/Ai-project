 "use client";

import { useState } from "react";
import { MOCK_MESSAGES } from "@/constants";
import { ChatBubble } from "@/components/ChatBubble";
import { TypingIndicator } from "@/components/TypingIndicator";

export default function ChatPage() {
  const [input, setInput] = useState("");

  return (
    <div className="flex h-[60vh] flex-1 flex-col">
      <header className="mb-3 flex items-baseline justify-between gap-2 border-b border-slate-100 pb-2 text-sm dark:border-slate-800">
        <div>
          <h1 className="text-base font-semibold text-slate-900 dark:text-slate-50">
            Chat
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            A calm space to explore what you&apos;re feeling today.
          </p>
        </div>
      </header>

      <div className="flex flex-1 flex-col overflow-hidden rounded-2xl bg-slate-50/80 p-3 text-sm dark:bg-slate-900/60">
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
          className="mt-3 flex items-end gap-2 rounded-xl border border-slate-200/80 bg-white/90 p-2 shadow-sm dark:border-slate-700 dark:bg-slate-900/80"
          onSubmit={(e) => {
            e.preventDefault();
          }}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={1}
            className="max-h-32 flex-1 resize-none bg-transparent text-xs text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-50"
            placeholder="Share what’s on your mind. There’s no wrong place to start."
          />
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200/80 bg-slate-50/80 text-[13px] text-slate-500 shadow-sm transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            🎤
          </button>
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-sky-500 via-indigo-500 to-fuchsia-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-indigo-500/40 transition hover:from-sky-600 hover:via-indigo-600 hover:to-fuchsia-600"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

