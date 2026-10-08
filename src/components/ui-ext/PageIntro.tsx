/**
 * Hallmark · component: page intro · theme: Siraj (custom)
 * states: default only (structural header)
 * RTL-aware: `leading` sits at the reading start (right), `actions`
 * at the reading end (left) on wide screens; both stack on mobile.
 */
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageIntroProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  /** Secondary slot — inline-start of the header (right side in RTL). */
  leading?: ReactNode;
  /** Primary actions — inline-end of the header (left side in RTL). */
  actions?: ReactNode;
  className?: string;
}

/** Full page header: the big display title, its rule, and its verbs. */
export function PageIntro({
  title,
  description,
  icon: Icon,
  leading,
  actions,
  className,
}: PageIntroProps) {
  return (
    <header
      className={cn(
        "mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        {leading ? (
          <div className="flex shrink-0 items-center gap-2">{leading}</div>
        ) : null}
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            {Icon ? (
              <Icon
                className="size-6 shrink-0 text-primary"
                aria-hidden="true"
              />
            ) : null}
            <h1 className="font-display text-2xl text-ink [overflow-wrap:anywhere] sm:text-3xl">
              {title}
            </h1>
          </div>
          <span className="siraj-rule mt-2 block" aria-hidden="true" />
          {description ? (
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-3 sm:text-base">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
          {actions}
        </div>
      ) : null}
    </header>
  );
}
