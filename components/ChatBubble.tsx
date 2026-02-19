import type { ChatRole } from "@/constants";

type ChatBubbleProps = {
  role: ChatRole;
  content: string;
};

export const ChatBubble = ({ role, content }: ChatBubbleProps) => {
  const isUser = role === "user";

  return (
    <div
      className={`flex w-full gap-3 ${isUser ? "justify-end text-right" : "justify-start text-left"
        }`}
    >
      {!isUser && (
        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-[#7C6AAE] via-[#D4A5A5] to-[#A8C5C0] text-xs font-semibold text-white shadow-sm shadow-[#1A1A1A]/15">
          AI
        </div>
      )}
      <div
        className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm ${isUser
            ? "bg-gradient-to-r from-[#7C6AAE] via-[#D4A5A5] to-[#A8C5C0] text-white shadow-[#1A1A1A]/15"
            : "bg-[#F5E8D8] text-[#2D2D2D]"
          }`}
      >
        {content}
      </div>
      {isUser && (
        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F5E8D8] text-xs font-semibold text-[#2D2D2D]">
          You
        </div>
      )}
    </div>
  );
};
