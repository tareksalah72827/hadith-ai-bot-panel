/**
 * Hallmark · component: stat card · theme: Siraj (custom)
 * states: default only (non-interactive — numbers, not buttons)
 */
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type StatTone = "default" | "primary" | "accent";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  tone?: StatTone;
  className?: string;
}

const toneStyles: Record<StatTone, string> = {
  default: "bg-paper-2 text-ink-2",
  primary: "bg-primary-soft text-primary",
  accent: "bg-gold/25 text-gold-deep",
};

/** One number that matters, set in mono on a card. */
export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "default",
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-md)] border border-line bg-card p-4 shadow-[var(--shadow-card)] sm:p-5",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)]",
            toneStyles[tone],
          )}
        >
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <span className="min-w-0 truncate text-sm text-ink-3">{label}</span>
      </div>
      <p dir="ltr" className="num mt-3 text-3xl font-medium text-ink">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-ink-3">{hint}</p> : null}
    </div>
  );
}
