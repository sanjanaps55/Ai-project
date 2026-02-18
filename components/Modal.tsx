import type { ReactNode } from "react";

type ModalProps = {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: ReactNode;
};

export const Modal = ({ open, title, onClose, children }: ModalProps) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-slate-50 p-4 shadow-xl shadow-slate-900/40 dark:bg-slate-900">
        <header className="mb-3 flex items-center justify-between gap-4">
          {title && (
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              {title}
            </h2>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-xs text-slate-500 transition hover:bg-slate-200/70 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            aria-label="Close"
          >
            ✕
          </button>
        </header>
        <div className="text-xs text-slate-700 dark:text-slate-300">
          {children}
        </div>
      </div>
    </div>
  );
};


