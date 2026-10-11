/**
 * The layout every error and not-found page shares: a centered card with a colored
 * icon, the error code as a chip, a title, a plain message, and actions.
 * No hooks, so it works in the server-rendered 404 page and inside the client
 * error boundaries (through ErrorState).
 */

import { Icon, type IconName } from "@/components/ui/Icon";
import type { AppError } from "@/lib/errors";

// Red for failures on our side; amber for "not found", which is usually a wrong link.
const tones = {
  danger: { tile: "bg-danger/10 text-danger", chip: "bg-danger/10 text-danger" },
  pending: { tile: "bg-pending-bg text-pending", chip: "bg-pending-bg text-pending" },
} as const;

/** Error layout: icon, code, title, message, then whatever actions and details are passed in. */
export function ErrorCard({
  appError,
  icon,
  tone,
  children,
}: {
  appError: AppError;
  icon: IconName;
  tone: keyof typeof tones;
  children: React.ReactNode;
}) {
  return (
    <div className="flex justify-center py-10 sm:py-16">
      <div className="flex w-full max-w-lg flex-col items-center gap-4 rounded-xl border border-line bg-surface p-8 text-center shadow-sm">
        <span className={`grid size-12 place-items-center rounded-full ${tones[tone].tile}`}>
          <Icon name={icon} className="size-6" />
        </span>
        <span className={`rounded-full px-2.5 py-0.5 font-mono text-xs font-medium ${tones[tone].chip}`}>
          Error {appError.code}
        </span>
        <h1 className="text-xl font-semibold tracking-tight text-balance">{appError.title}</h1>
        <p role="alert" className="max-w-sm text-muted">
          {appError.message}
        </p>
        <div className="mt-2 flex w-full flex-col items-center gap-4">{children}</div>
      </div>
    </div>
  );
}
