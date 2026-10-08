/**
 * Hallmark · component: empty state · theme: Siraj (custom)
 * states: default only (structural, non-interactive)
 */
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/** The page speaks even when there is nothing to show. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-1.5 px-4 py-10 text-center",
        className,
      )}
    >
      {Icon ? (
        <span className="flex size-12 items-center justify-center rounded-full bg-paper-2">
          <Icon className="size-6 text-ink-3" aria-hidden="true" />
        </span>
      ) : null}
      <p className="mt-2 font-display text-lg text-ink-2">{title}</p>
      {description ? (
        <p className="max-w-sm text-sm leading-relaxed text-ink-3">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
