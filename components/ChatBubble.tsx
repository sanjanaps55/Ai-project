import type { ChatRole } from "@/constants";

type ChatBubbleProps = {
  role: ChatRole;
  content: string;
};

export const ChatBubble = ({ role, content }: ChatBubbleProps) => {
  const isUser = role === "user";

  return (
    <div
      className={`flex w-full gap-3 ${isUser ? "justify-end" : "justify-start"}`}
    >
      {!isUser && (
        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-primary-purple to-secondary text-[10px] font-bold text-bg-dark shadow-[0_0_15px_rgba(199,184,234,0.3)]">
          AI
        </div>
      )}
      <div
        className={`max-w-[85%] rounded-2xl px-5 py-3 text-sm leading-relaxed ${isUser
            ? "bg-primary-purple text-bg-dark font-medium shadow-[0_0_20px_rgba(199,184,234,0.2)]"
            : "glass-card text-white/90"
          }`}
      >
        {content}
      </div>
      {isUser && (
        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[8px] font-bold text-white/40 uppercase tracking-widest">
          You
        </div>
      )}
    </div>
  );
};
