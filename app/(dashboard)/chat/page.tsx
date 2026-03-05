"use client";

import { useState } from "react";
import { MOCK_MESSAGES } from "@/constants";
import { ChatBubble } from "@/components/ChatBubble";
import { TypingIndicator } from "@/components/TypingIndicator";
import { Send, Mic } from "lucide-react";

export default function ChatPage() {
  const [input, setInput] = useState("");

  return (
    <div className="flex flex-col h-full">
      {/* Spacer for TopBar when fixed */}
      <div className="h-4" />

      {/* Chat area */}
      <div className="flex-1 space-y-6 overflow-y-auto pb-24 px-2 scrollbar-none min-h-[50vh]">
        {MOCK_MESSAGES.map((message, index) => (
          <ChatBubble
            key={index}
            role={message.role as "user" | "ai"}
            content={message.content}
          />
        ))}
        <div className="flex justify-start">
          <TypingIndicator />
        </div>
      </div>

      {/* Message Input Bar - Positioned relative to the viewport/container */}
      <div className="sticky bottom-20 left-0 right-0 z-30 pb-2">
        <form
          className="glass-morphism rounded-[24px] p-1.5 flex items-center gap-1 shadow-[0_0_40px_rgba(0,0,0,0.5)] border-white/10"
          onSubmit={(e) => {
            e.preventDefault();
            if (input.trim()) setInput("");
          }}
        >
          <button
            type="button"
            className="p-2.5 rounded-full hover:bg-white/5 text-white/40 transition-colors"
          >
            <Mic size={18} />
          </button>

          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 bg-transparent px-2 py-2.5 text-sm text-white outline-none placeholder:text-white/20"
            placeholder="Send a message..."
          />

          <button
            type="submit"
            disabled={!input.trim()}
            className={`p-2.5 rounded-full transition-all ${input.trim()
              ? "bg-primary-purple text-bg-dark shadow-[0_0_20px_rgba(199,184,234,0.3)] scale-100"
              : "bg-white/5 text-white/20 scale-90"
              }`}
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
