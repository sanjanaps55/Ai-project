export const TypingIndicator = () => {
  return (
    <div className="flex items-center gap-2 text-xs text-[#9A9A9A] dark:text-[#C5C0BA]">
      <span className="inline-flex h-2 w-2 animate-bounce rounded-full bg-[#8B6BB5] [animation-delay:-0.2s]" />
      <span className="inline-flex h-2 w-2 animate-bounce rounded-full bg-[#D4A5A5] [animation-delay:-0.1s]" />
      <span className="inline-flex h-2 w-2 animate-bounce rounded-full bg-[#A8C5C0]" />
    </div>
  );
};


