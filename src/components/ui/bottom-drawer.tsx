"use client";

import { useEffect } from "react";

type BottomDrawerProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
};

export function BottomDrawer({
  open,
  onClose,
  title,
  children,
}: BottomDrawerProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50">
      <button
        aria-label="Close"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        type="button"
      />
      <div
        aria-modal="true"
        className="animate-sheet-slide-up absolute inset-x-0 bottom-0 mx-auto flex max-h-[min(90vh,720px)] max-w-3xl flex-col rounded-t-3xl bg-surface shadow-[0_-8px_30px_rgb(0_0_0/0.12)] ring-1 ring-black/5"
        role="dialog"
      >
        <div className="shrink-0 px-4 pt-3">
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-black/10" />
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-foreground">{title}</h2>
            <button
              className="rounded-lg px-2 py-1 text-sm font-medium text-muted hover:bg-brand/5 hover:text-foreground"
              onClick={onClose}
              type="button"
            >
              Close
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </div>
  );
}
