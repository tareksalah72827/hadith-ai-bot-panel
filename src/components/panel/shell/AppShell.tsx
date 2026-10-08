'use client';

/**
 * AppShell — the panel backbone: RTL sidebar on the right (desktop) + mobile
 * Sheet nav, sticky topbar (section title, bot status pill, theme toggle,
 * account menu) and the scrollable main area. page.tsx swaps the children
 * per view; the shell only reads bot status and navigates by hash.
 */
import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { LayoutDashboard, Loader2, LogOut, Menu, Moon, Sun } from 'lucide-react';
import { NAV_ICONS, NAV_ITEMS, navLabel, navigate } from '@/components/panel/shared/nav';
import { useBotResource } from '@/components/panel/shared/hooks';
import { api } from '@/lib/browser-api';
import type { BotStatus } from '@/lib/types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

/**
 * Shared CSS: pulse dot (transform/opacity only, reduced-motion aware) and
 * slim custom scrollbars, both driven by theme tokens.
 */
const GLOBAL_CSS = `
@keyframes hadith-pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.45; transform: scale(0.75); } }
.hadith-pulse-dot { animation: hadith-pulse 1.7s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) { .hadith-pulse-dot { animation: none; } }
.hadith-scroll { scrollbar-width: thin; scrollbar-color: var(--color-paper-3) transparent; }
.hadith-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
.hadith-scroll::-webkit-scrollbar-thumb { background: var(--color-paper-3); border-radius: 999px; }
.hadith-scroll::-webkit-scrollbar-track { background: transparent; }
`;

const THEME_KEY = 'hadith-theme';
const THEME_EVENT = 'hadith-theme-change';
const FOOTER_TEXT = 'UNIRAL للتطوير التقني — مؤسس المنظمة: د. طارق الفارس';

/** Apply the theme on <html> (class + data-theme so either token set works). */
function applyTheme(dark: boolean) {
  const root = document.documentElement;
  root.classList.toggle('dark', dark);
  root.setAttribute('data-theme', dark ? 'dark' : 'light');
}

/** useSyncExternalStore plumbing — the DOM class IS the theme store. */
function subscribeTheme(callback: () => void) {
  window.addEventListener(THEME_EVENT, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(THEME_EVENT, callback);
    window.removeEventListener('storage', callback);
  };
}

function readThemeSnapshot(): boolean {
  return document.documentElement.classList.contains('dark');
}

function readServerTheme(): boolean {
  return false; // SSR always renders light; hydration stays consistent
}

/** Persist + apply + notify subscribers. */
function setTheme(next: boolean) {
  applyTheme(next);
  try {
    window.localStorage.setItem(THEME_KEY, next ? 'dark' : 'light');
  } catch {
    /* ignore write failures */
  }
  window.dispatchEvent(new Event(THEME_EVENT));
}

function BrandBlock() {
  return (
    <div className="flex min-w-0 items-center gap-3 px-4">
      <span
        className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-paper-3)]"
        aria-hidden="true"
      >
        <Moon className="size-5" style={{ color: 'var(--color-accent)' }} />
      </span>
      <div className="min-w-0">
        <p
          className="truncate text-base font-bold leading-5 text-[var(--color-ink)]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Hadith Ai.BOT
        </p>
        <p className="truncate text-xs leading-4 text-[var(--color-ink-3)]">لوحة التحكم الإدارية</p>
      </div>
    </div>
  );
}

function NavList({
  current,
  pending,
  onSelect,
}: {
  current: string;
  pending: number;
  onSelect: (view: string) => void;
}) {
  return (
    <nav aria-label="التنقل الرئيسي" className="flex flex-col gap-1 px-3 py-2">
      {NAV_ITEMS.map((item) => {
        const Icon = NAV_ICONS[item.icon] ?? LayoutDashboard;
        const active = item.key === current;
        const showBadge = item.key === 'groups' && pending > 0;
        return (
          <a
            key={item.key}
            href={`#/${item.key}`}
            aria-current={active ? 'page' : undefined}
            onClick={(e) => {
              e.preventDefault();
              onSelect(item.key);
            }}
            className={cn(
              'flex min-h-[44px] items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]',
              active
                ? 'bg-[var(--color-primary)] font-medium text-[var(--color-paper)]'
                : 'text-[var(--color-ink-2)] hover:bg-[var(--color-paper-3)] hover:text-[var(--color-ink)]',
            )}
          >
            <Icon className="size-5 shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            {showBadge && (
              <span
                className={cn(
                  'inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold',
                  active
                    ? 'bg-[var(--color-paper)] text-[var(--color-primary)]'
                    : 'bg-[var(--color-accent)] text-[var(--color-ink)]',
                )}
                style={{ fontFamily: 'var(--font-mono)' }}
                title="طلبات جروبات معلقة"
              >
                {pending > 99 ? '99+' : pending}
              </span>
            )}
          </a>
        );
      })}
    </nav>
  );
}

function StatusPill({ status, loading }: { status: BotStatus | null; loading: boolean }) {
  const connected = status?.connected === true;
  const connecting = status?.connecting === true;
  const label = connected ? 'متصل' : connecting ? 'جارٍ الاتصال' : loading && !status ? '…' : 'غير متصل';
  const dotColor = connected
    ? 'var(--color-success)'
    : connecting
      ? 'var(--color-warn)'
      : 'var(--color-ink-3)';
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--color-line)] bg-[var(--color-paper-2)] px-2.5 py-1 text-xs text-[var(--color-ink-2)]"
      title={connected ? 'البوت متصل بواتساب' : 'حالة اتصال البوت'}
    >
      <span
        className={cn('size-2 shrink-0 rounded-full', (connected || connecting) && 'hadith-pulse-dot')}
        style={{ backgroundColor: dotColor }}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}

export default function AppShell({
  view,
  username,
  children,
}: {
  view: string;
  username: string;
  children: ReactNode;
}) {
  const status = useBotResource<BotStatus>('/api/bot/status', 20000);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const dark = useSyncExternalStore(subscribeTheme, readThemeSnapshot, readServerTheme);

  // Theme: restore the saved preference (or system default) once on mount.
  // Only syncs the external DOM/localStorage store — no component state.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(THEME_KEY);
      const isDark =
        saved === 'dark'
          ? true
          : saved === 'light'
            ? false
            : window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (isDark !== document.documentElement.classList.contains('dark')) {
        applyTheme(isDark);
        window.dispatchEvent(new Event(THEME_EVENT));
      }
    } catch {
      /* storage unavailable — keep the light theme */
    }
  }, []);

  const pending = status.data?.stats.pendingGroups ?? 0;
  const title = navLabel(view);
  const initial = (username.trim()[0] ?? '؟').toUpperCase();

  function toggleTheme() {
    setTheme(!dark);
  }

  async function handleLogout() {
    setLoggingOut(true);
    await api.logout();
    window.location.reload();
  }

  function go(v: string) {
    setMobileOpen(false);
    navigate(v);
  }

  return (
    <div dir="rtl" className="flex min-h-screen bg-[var(--color-paper)] text-[var(--color-ink)]">
      {/* Desktop sidebar — right side in RTL */}
      <aside
        className="sticky top-0 hidden h-screen w-[264px] shrink-0 flex-col bg-[var(--color-paper-2)] lg:flex"
        style={{ borderInlineEnd: '1px solid var(--color-line)' }}
      >
        <div className="flex h-16 shrink-0 items-center border-b" style={{ borderColor: 'var(--color-line)' }}>
          <BrandBlock />
        </div>
        <div className="hadith-scroll min-h-0 flex-1 overflow-y-auto py-2">
          <NavList current={view} pending={pending} onSelect={go} />
        </div>
        <div
          className="shrink-0 px-4 py-3 text-[11px] leading-relaxed text-[var(--color-ink-3)]"
          style={{ borderTop: '1px solid var(--color-line)' }}
        >
          {FOOTER_TEXT}
        </div>
      </aside>

      {/* Content column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 bg-[var(--color-paper)] px-4"
          style={{ borderBottom: '1px solid var(--color-line)' }}
        >
          <Button
            variant="ghost"
            size="icon"
            className="size-11 lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="فتح قائمة التنقل"
          >
            <Menu className="size-5" aria-hidden="true" />
          </Button>
          <h1 className="min-w-0 flex-1 truncate text-base font-semibold md:text-lg">{title}</h1>

          <div className="flex shrink-0 items-center gap-1.5 md:gap-2">
            <StatusPill status={status.data} loading={status.loading} />
            <Button
              variant="ghost"
              size="icon"
              className="size-11"
              onClick={toggleTheme}
              aria-label={dark ? 'التبديل إلى النمط الفاتح' : 'التبديل إلى النمط الداكن'}
              title={dark ? 'النمط الفاتح' : 'النمط الداكن'}
            >
              {dark ? (
                <Sun className="size-5" aria-hidden="true" />
              ) : (
                <Moon className="size-5" aria-hidden="true" />
              )}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex shrink-0 items-center gap-2 rounded-full p-1.5 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]"
                  aria-label="قائمة الحساب"
                >
                  <span className="hidden max-w-28 truncate text-sm text-[var(--color-ink-2)] md:inline">
                    {username}
                  </span>
                  <Avatar className="size-8 border" style={{ borderColor: 'var(--color-line)' }}>
                    <AvatarFallback
                      className="text-sm font-semibold text-[var(--color-paper)]"
                      style={{ backgroundColor: 'var(--color-primary)', fontFamily: 'var(--font-display)' }}
                    >
                      {initial}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="border-[var(--color-line)] bg-[var(--color-paper-2)]">
                <DropdownMenuLabel className="max-w-48 truncate text-[var(--color-ink)]">
                  {username}
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-[var(--color-line)]" />
                <DropdownMenuItem
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="text-[var(--color-danger)] focus:text-[var(--color-danger)]"
                >
                  {loggingOut ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <LogOut className="size-4" aria-hidden="true" />
                  )}
                  تسجيل الخروج
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-y-auto p-4 md:p-6">{children}</main>

        {/* Mobile footer — sticks to the bottom on short content */}
        <footer
          className="mt-auto shrink-0 px-4 py-3 text-center text-[11px] leading-relaxed text-[var(--color-ink-3)] lg:hidden"
          style={{ borderTop: '1px solid var(--color-line)' }}
        >
          {FOOTER_TEXT}
        </footer>
      </div>

      {/* Mobile navigation sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="right"
          className="w-72 gap-0 border-[var(--color-line)] bg-[var(--color-paper-2)] p-0"
        >
          <SheetHeader
            className="border-b ps-12 py-4"
            style={{ borderColor: 'var(--color-line)' }}
          >
            <SheetTitle
              className="text-base font-bold text-[var(--color-ink)]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Hadith Ai.BOT
            </SheetTitle>
            <SheetDescription className="text-xs text-[var(--color-ink-3)]">
              لوحة التحكم الإدارية
            </SheetDescription>
          </SheetHeader>
          <div className="hadith-scroll min-h-0 flex-1 overflow-y-auto">
            <NavList current={view} pending={pending} onSelect={go} />
          </div>
          <div
            className="shrink-0 px-4 py-3 text-[11px] leading-relaxed text-[var(--color-ink-3)]"
            style={{ borderTop: '1px solid var(--color-line)' }}
          >
            {FOOTER_TEXT}
          </div>
        </SheetContent>
      </Sheet>

      <style>{GLOBAL_CSS}</style>
    </div>
  );
}
