import type { ChatRole } from "@/constants";

type ChatBubbleProps = {
  role: ChatRole;
  content: string;
};

export const ChatBubble = ({ role, content }: ChatBubbleProps) => {
  const isUser = role === "user";

  return (
    <div
      className={`flex w-full gap-3 ${
        isUser ? "justify-end text-right" : "justify-start text-left"
      }`}
    >
      {!isUser && (
        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-sky-500 via-indigo-500 to-fuchsia-500 text-xs font-semibold text-white shadow-sm">
          AI
        </div>
      )}
      <div
        className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm ${
          isUser
            ? "bg-indigo-500 text-white shadow-indigo-500/30"
            : "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-50"
        }`}
      >
        {content}
      </div>
      {isUser && (
        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-800 dark:bg-slate-700 dark:text-slate-100">
          You
        </div>
      )}
    </div>
  );
};


