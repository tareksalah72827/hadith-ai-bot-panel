/**
 * Hallmark · component: panel card · theme: Siraj (custom)
 * states: default · hover (border tint, no motion) · focus-visible (global ring)
 */
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PanelCardProps {
  title?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Base surface of the workbench — a quiet sheet of paper on the desk. */
export function PanelCard({
  title,
  icon: Icon,
  action,
  children,
  className,
}: PanelCardProps) {
  const hasHeader = Boolean(title || Icon || action);

  return (
    <section
      className={cn(
        "rounded-[var(--radius-md)] border border-line bg-card text-ink shadow-[var(--shadow-card)] hover:border-primary-soft",
        className,
      )}
    >
      {hasHeader && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 pb-3 sm:p-6 sm:pb-4">
          <div className="flex min-w-0 items-center gap-2.5">
            {Icon ? (
              <Icon className="size-5 shrink-0 text-primary" aria-hidden="true" />
            ) : null}
            {title ? (
              <h3 className="truncate font-display text-lg text-ink">{title}</h3>
            ) : null}
          </div>
          {action ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {action}
            </div>
          ) : null}
        </div>
      )}
      <div
        className={cn(
          hasHeader ? "px-4 pb-4 sm:px-6 sm:pb-6" : "p-4 sm:p-6",
        )}
      >
        {children}
      </div>
    </section>
  );
}
