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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-[#C5C0BA] bg-[#EDE8E0] p-4 shadow-xl shadow-[#1A1A1A]/20 dark:border-[#1A1A1A] dark:bg-[#1A1A1A] dark:shadow-black/40">
        <header className="mb-3 flex items-center justify-between gap-4">
          {title && (
            <h2 className="text-sm font-semibold text-[#2D2D2D] dark:text-[#EDE8E0]">
              {title}
            </h2>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-xs text-[#9A9A9A] transition hover:bg-[#E0DEDA] hover:text-[#2D2D2D] dark:text-[#C5C0BA] dark:hover:bg-[#1A1A1A] dark:hover:text-[#EDE8E0]"
            aria-label="Close"
          >
            ✕
          </button>
        </header>
        <div className="text-xs text-[#2D2D2D] dark:text-[#EDE8E0]/90">
          {children}
        </div>
      </div>
    </div>
  );
};


