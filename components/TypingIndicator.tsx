export const TypingIndicator = () => {
  return (
    <div className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-white/5 border border-white/5 w-fit">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary-purple [animation-delay:-0.3s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-secondary [animation-delay:-0.15s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent" />
    </div>
  );
};
