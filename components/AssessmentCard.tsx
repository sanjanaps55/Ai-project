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
    <article className="flex flex-col justify-between rounded-2xl border border-slate-200/70 bg-white/80 p-4 text-sm shadow-sm shadow-slate-900/5 transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-200/40 dark:border-slate-700 dark:bg-slate-900/80 dark:hover:border-indigo-500/60 dark:hover:shadow-indigo-900/60">
      <div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
          {title}
        </h3>
        <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
          {description}
        </p>
      </div>
      <button
        type="button"
        onClick={onStart}
        className="mt-4 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-sky-500 via-indigo-500 to-fuchsia-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-indigo-500/40 transition hover:from-sky-600 hover:via-indigo-600 hover:to-fuchsia-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
      >
        Start
      </button>
    </article>
  );
};


