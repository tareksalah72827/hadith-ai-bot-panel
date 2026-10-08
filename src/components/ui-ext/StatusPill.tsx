/**
 * Hallmark · component: status pill · theme: Siraj (custom)
 * states: ok / bad (visual states, not interactive) · pulse = CSS-only heartbeat
 */
import { cn } from "@/lib/utils";

interface StatusPillProps {
  ok: boolean;
  labelOk?: string;
  labelBad?: string;
  pulse?: boolean;
  className?: string;
}

/** Connection lamp — a small breathing dot in a pill. */
export function StatusPill({
  ok,
  labelOk = "متصل",
  labelBad = "غير متصل",
  pulse = false,
  className,
}: StatusPillProps) {
  const label = ok ? labelOk : labelBad;

  return (
    <span
      role="status"
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium",
        ok ? "bg-success/15 text-success" : "bg-danger/10 text-danger",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-2 shrink-0 rounded-full bg-current",
          ok && pulse && "status-pulse",
        )}
      />
      <span>{label}</span>
    </span>
  );
}
