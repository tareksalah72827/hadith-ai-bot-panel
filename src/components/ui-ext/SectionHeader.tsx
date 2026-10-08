/**
 * Hallmark · component: section header · theme: Siraj (custom)
 * states: default only (structural, non-interactive)
 */
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  className?: string;
}

/** Display heading with the illuminated gold→emerald rule beneath it. */
export function SectionHeader({
  title,
  description,
  icon: Icon,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn("mb-4", className)}>
      <div className="flex items-center gap-2">
        {Icon ? (
          <Icon className="size-5 shrink-0 text-primary" aria-hidden="true" />
        ) : null}
        <h2 className="font-display text-2xl text-ink">{title}</h2>
      </div>
      <span className="siraj-rule mt-2 block" aria-hidden="true" />
      {description ? (
        <p className="mt-2 text-sm leading-relaxed text-ink-3">{description}</p>
      ) : null}
    </div>
  );
}
