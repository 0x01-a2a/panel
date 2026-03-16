"use client";
import { useEffect, useCallback, ReactNode } from "react";

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKey);
      return () => document.removeEventListener("keydown", handleKey);
    }
  }, [open, handleKey]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`bg-[var(--card)] border border-[var(--border)] rounded-lg ${
          wide ? "w-full max-w-4xl" : "w-full max-w-xl"
        } max-h-[85vh] overflow-hidden flex flex-col`}
      >
        {title && (
          <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)]">
            <h2 className="text-[11px] tracking-[3px] text-[var(--green)] font-bold">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="text-[var(--sub)] hover:text-[var(--text)] text-sm transition-colors"
            >
              ESC
            </button>
          </div>
        )}
        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
