type AssessmentCardProps = {
  title: string;
  description: string;
  onStart?: () => void;
};

export const AssessmentCard = ({
  title,
  description,
  onStart,
}: AssessmentCardProps) => {
  return (
    <article className="flex flex-col justify-between rounded-2xl border border-[#C5C0BA] bg-[#EDE8E0] p-4 text-sm backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-[#8B6BB5] hover:bg-white/80 dark:border-[#1A1A1A] dark:bg-[#1A1A1A] dark:hover:border-[#8B6BB5]">
      <div>
        <h3 className="text-sm font-semibold text-[#2D2D2D] dark:text-[#EDE8E0]">
          {title}
        </h3>
        <p className="mt-2 text-xs text-[#9A9A9A] dark:text-[#C5C0BA]">
          {description}
        </p>
      </div>
      <button
        type="button"
        onClick={onStart}
        className="mt-4 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-[#8B6BB5] via-[#D4A5A5] to-[#A8C5C0] px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-[#1A1A1A]/15 transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B6BB5]"
      >
        Start
      </button>
    </article>
  );
};


