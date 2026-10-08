/**
 * Hallmark · component: theme toggle · theme: Siraj (custom)
 * states: default · hover · focus-visible (global ring) · active — the rest
 * of the button states are inherited from the shadcn Button.
 * Both icons are always in the DOM; CSS decides which one the reader sees —
 * no hydration mismatch, no effects.
 */
"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

/** Switches the lamp: day paper ↔ night manuscript. */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="size-11 shrink-0"
      aria-label="تبديل بين الوضع النهاري والليلي"
      title={isDark ? "الوضع النهاري" : "الوضع الليلي"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      <Sun className="size-4 hidden dark:block" aria-hidden="true" />
      <Moon className="size-4 block dark:hidden" aria-hidden="true" />
    </Button>
  );
}
