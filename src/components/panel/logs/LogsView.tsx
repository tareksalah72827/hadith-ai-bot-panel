'use client';

/**
 * LogsView — bot server log feed with level filter, text search,
 * collapsible metadata, and an auto-refresh switch.
 */
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ChevronDown, Filter, Loader2, RefreshCw, ScrollText, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { useBotResource } from '@/components/panel/shared/hooks';
import type { LogEntry } from '@/lib/types';

// ---- Theme tokens (var-only, with shadcn fallbacks) ----
const INK = 'var(--color-ink, var(--foreground))';
const INK2 = 'var(--color-ink-2, var(--muted-foreground))';
const INK3 = 'var(--color-ink-3, var(--muted-foreground))';
const PRIMARY_DEEP = 'var(--color-primary-deep, var(--primary))';
const DANGER = 'var(--color-danger, var(--destructive))';
const MONO = "var(--font-mono, 'IBM Plex Mono', monospace)";
const DISPLAY = "var(--font-display, 'Amiri', serif)";

// Level colors — calm teal-green / amber / red (all through tokens)
const INFO_BG = 'color-mix(in oklab, var(--color-primary, var(--primary)) 12%, var(--color-paper, var(--background)))';
const WARN_BG = 'color-mix(in oklab, var(--color-warn, var(--chart-4)) 16%, var(--color-paper, var(--background)))';
const WARN_FG = 'color-mix(in oklab, var(--color-warn, var(--chart-4)) 70%, var(--color-ink, var(--foreground)))';
const ERROR_BG = 'color-mix(in oklab, var(--color-danger, var(--destructive)) 12%, var(--color-paper, var(--background)))';

const LEVEL_LABEL: Record<LogEntry['level'], string> = {
  info: 'معلومة',
  warn: 'تحذير',
  error: 'خطأ',
};

const arNum = (n: number): string => n.toLocaleString('ar-EG');

/** Classic mono log timestamp, always LTR. */
function logTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const p = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function LevelBadge({ level }: { level: LogEntry['level'] }): ReactNode {
  if (level === 'warn') {
    return <Badge style={{ backgroundColor: WARN_BG, color: WARN_FG, borderColor: 'transparent' }}>{LEVEL_LABEL[level]}</Badge>;
  }
  if (level === 'error') {
    return <Badge style={{ backgroundColor: ERROR_BG, color: DANGER, borderColor: 'transparent' }}>{LEVEL_LABEL[level]}</Badge>;
  }
  return <Badge style={{ backgroundColor: INFO_BG, color: PRIMARY_DEEP, borderColor: 'transparent' }}>{LEVEL_LABEL[level]}</Badge>;
}

export default function LogsView(): ReactNode {
  const [level, setLevel] = useState<'all' | LogEntry['level']>('all');
  const [q, setQ] = useState('');
  const [auto, setAuto] = useState(true);

  // Pausing auto-refresh simply stretches the polling interval to ~24 days
  const path = level === 'all' ? '/api/bot/logs?limit=150' : `/api/bot/logs?level=${level}&limit=150`;
  const res = useBotResource<{ logs: LogEntry[] }>(path, auto ? 10000 : 2147483000);

  const logs = res.data?.logs ?? [];
  // Text filter runs client-side over the fetched page
  const filtered = useMemo(() => {
    const needle = q.trim();
    if (needle === '') return logs;
    return logs.filter((l) => l.message.includes(needle) || l.type.includes(needle));
  }, [logs, q]);

  const showSkeleton = res.loading && !res.data;
  const showError = res.error !== null && !res.data;

  return (
    <div className="space-y-6">
      <header className="space-y-1.5">
        <h1 className="text-2xl font-bold leading-tight sm:text-3xl" style={{ fontFamily: DISPLAY, color: INK }}>
          السجلات
        </h1>
        <p className="text-sm" style={{ color: INK2 }}>
          أحدث ما يجري على سيرفر البوت — رسائل، جدولة، وأخطاء.
        </p>
        <Separator className="mt-3" />
      </header>

      {showError ? (
        <Card style={{ borderColor: DANGER }}>
          <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
            <p className="font-medium" style={{ color: DANGER }}>تعذّر تحميل السجلات</p>
            <p className="text-sm" style={{ color: INK2 }}>{res.error}</p>
            <Button variant="outline" size="sm" onClick={res.refresh}>
              <RefreshCw aria-hidden /> إعادة المحاولة
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-0 flex-1 basis-56">
              <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4" style={{ color: INK3 }} aria-hidden />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="ابحث في نص السجلات…"
                className="ps-9"
                aria-label="البحث في السجلات"
                inputMode="search"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="size-4 shrink-0" style={{ color: INK3 }} aria-hidden />
              <Select value={level} onValueChange={(v) => setLevel(v as 'all' | LogEntry['level'])}>
                <SelectTrigger className="h-11 w-36 sm:h-9" aria-label="تصفية بالمستوى">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل المستويات</SelectItem>
                  <SelectItem value="info">معلومة</SelectItem>
                  <SelectItem value="warn">تحذير</SelectItem>
                  <SelectItem value="error">خطأ</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <label className="flex h-11 cursor-pointer items-center gap-2 sm:h-9" htmlFor="logs-auto">
              <Switch id="logs-auto" checked={auto} onCheckedChange={setAuto} aria-label="تحديث تلقائي للسجلات" />
              <span className="text-sm" style={{ color: INK2 }}>تحديث تلقائي</span>
            </label>
            <Button
              variant="outline"
              size="icon"
              className="size-11 sm:size-9"
              onClick={res.refresh}
              aria-label="تحديث السجلات الآن"
              title="تحديث الآن"
            >
              {res.loading ? <Loader2 className="animate-spin" aria-hidden /> : <RefreshCw aria-hidden />}
            </Button>
          </div>

          {/* Counter */}
          <p className="text-sm" style={{ color: INK2 }} aria-live="polite">
            <span className="font-semibold tabular-nums" style={{ color: INK }}>{arNum(filtered.length)}</span> سجلًا
            {q.trim() !== '' && filtered.length !== logs.length && (
              <span style={{ color: INK3 }}> (من أصل {arNum(logs.length)})</span>
            )}
          </p>

          {showSkeleton ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
                <ScrollText className="size-10" style={{ color: INK3 }} aria-hidden />
                <p className="font-medium" style={{ color: INK }}>لا سجلات مطابقة</p>
                <p className="max-w-sm text-sm" style={{ color: INK2 }}>
                  {q.trim() !== ''
                    ? 'جرّب تعديل البحث أو المستوى المحدد.'
                    : 'حين يعمل البوت ستظهر أحداثه هنا لحظة بلحظة.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="max-h-[70vh] rounded-lg border" dir="rtl">
              <ul className="divide-y" aria-label="قائمة السجلات">
                {filtered.map((l) => (
                  <li key={l.id} className="px-3 py-2.5 transition-colors hover:bg-accent/30 sm:px-4">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                      <time
                        dir="ltr"
                        className="shrink-0 font-mono text-[11px] tabular-nums"
                        style={{ fontFamily: MONO, color: INK3 }}
                        dateTime={l.at}
                      >
                        {logTime(l.at)}
                      </time>
                      <LevelBadge level={l.level} />
                      <Badge variant="outline" className="font-mono text-[10px]" style={{ fontFamily: MONO }}>
                        {l.type}
                      </Badge>
                      <p className="min-w-0 flex-1 basis-full text-sm sm:basis-auto" dir="auto" style={{ color: INK }}>
                        {l.message}
                      </p>
                    </div>
                    {l.meta && (
                      <Collapsible className="mt-1">
                        <CollapsibleTrigger className="group flex items-center gap-1 text-xs transition-colors" style={{ color: INK2 }}>
                          <ChevronDown className="size-3.5 transition-transform duration-200 group-data-[state=open]:rotate-180" aria-hidden />
                          التفاصيل
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <pre
                            dir="auto"
                            className="mt-1.5 max-h-48 overflow-auto whitespace-pre-wrap break-all rounded-md p-2.5 font-mono text-[11px] leading-relaxed"
                            style={{ fontFamily: MONO, backgroundColor: 'var(--color-paper-2, var(--muted))', color: INK2 }}
                          >
                            {l.meta}
                          </pre>
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                  </li>
                ))}
              </ul>
            </ScrollArea>
          )}
        </>
      )}
    </div>
  );
}
