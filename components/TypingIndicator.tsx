export const TypingIndicator = () => {
  return (
    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
      <span className="inline-flex h-2 w-2 animate-bounce rounded-full bg-slate-500 [animation-delay:-0.2s] dark:bg-slate-300" />
      <span className="inline-flex h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.1s] dark:bg-slate-200" />
      <span className="inline-flex h-2 w-2 animate-bounce rounded-full bg-slate-300 dark:bg-slate-100" />
    </div>
  );
};


