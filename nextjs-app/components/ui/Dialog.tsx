"use client";

/**
 * Modal dialog built on the native <dialog> element: showModal() gives a backdrop, keeps
 * focus inside, and closes on Escape for free. Client Component (it calls showModal).
 * Used for every review decision, so nothing changes without a confirmation.
 */

import { useEffect, useRef } from "react";

/** Open when `open` is true; Escape, the backdrop or a Cancel button call onClose. */
export function Dialog({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  // Keep the native dialog in step with the `open` prop.
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={onClose} // fires on Escape too
      onClick={(e) => e.target === ref.current && onClose()} // a click on the backdrop
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-xl border border-line bg-surface p-0 text-ink shadow-xl backdrop:bg-ink/40 motion-safe:open:animate-appear"
    >
      <div className="flex flex-col gap-4 p-6">
        <h2 className="text-lg font-semibold">{title}</h2>
        {children}
      </div>
    </dialog>
  );
}
