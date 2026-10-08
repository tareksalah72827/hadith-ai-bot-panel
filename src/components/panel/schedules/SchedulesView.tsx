'use client';

/**
 * SchedulesView — bot-side cron jobs (Friday reminder, ayah interval,
 * AI quotes, adhkar) with per-card enable switches and config editors.
 */
import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  AudioLines, CalendarDays, Clock, Loader2, RefreshCw, Sparkles, Sunrise, Sunset, type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useBotMutation, useBotResource } from '@/components/panel/shared/hooks';
import { api } from '@/lib/browser-api';
import type { BotSettings, ScheduleItem } from '@/lib/types';

// ---- Theme tokens (var-only, with shadcn fallbacks) ----
const INK = 'var(--color-ink, var(--foreground))';
const INK2 = 'var(--color-ink-2, var(--muted-foreground))';
const INK3 = 'var(--color-ink-3, var(--muted-foreground))';
const PAPER2 = 'var(--color-paper-2, var(--muted))';
const PRIMARY_DEEP = 'var(--color-primary-deep, var(--primary))';
const DANGER = 'var(--color-danger, var(--destructive))';
const PRIMARY_SOFT = 'color-mix(in oklab, var(--color-primary, var(--primary)) 10%, var(--color-paper, var(--background)))';
const MONO = "var(--font-mono, 'IBM Plex Mono', monospace)";
const DISPLAY = "var(--font-display, 'Amiri', serif)";

const arNum = (n: number): string => n.toLocaleString('ar-EG');

/** "HH:MM" from the hour/minute cron fields, empty when unparsable. */
function timeFromCron(cron: string | undefined): string {
  if (!cron) return '';
  const f = cron.trim().split(/\s+/);
  if (f.length < 5 || !/^\d+$/.test(f[0]) || !/^\d+$/.test(f[1])) return '';
  return `${String(Number(f[1])).padStart(2, '0')}:${String(Number(f[0])).padStart(2, '0')}`;
}

/** Comma list of "HH:MM" from a cron hour list (e.g. "0 8,14,20 * * *"). */
function timesFromCron(cron: string | undefined): string {
  if (!cron) return '';
  const f = cron.trim().split(/\s+/);
  if (f.length < 5 || !/^\d+$/.test(f[0]) || !/^[0-9,]+$/.test(f[1])) return '';
  const minutes = String(Number(f[0])).padStart(2, '0');
  return f[1]
    .split(',')
    .map((h) => `${String(Number(h)).padStart(2, '0')}:${minutes}`)
    .join(',');
}

function formatRelative(iso: string | null): string {
  if (!iso) return 'لم يُشغَّل بعد';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '—';
  const diff = Math.round((then - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat('ar-EG', { numeric: 'auto' });
  const abs = Math.abs(diff);
  if (abs < 60) return rtf.format(diff, 'second');
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
  return rtf.format(Math.round(diff / 86400), 'day');
}

const TIMES_RE = /^([01]?\d|2[0-3]):[0-5]?\d(\s*,\s*([01]?\d|2[0-3]):[0-5]?\d)*$/;

function ViewHeader({ title, description }: { title: string; description: string }) {
  return (
    <header className="space-y-1.5">
      <h1 className="text-2xl font-bold leading-tight sm:text-3xl" style={{ fontFamily: DISPLAY, color: INK }}>
        {title}
      </h1>
      <p className="text-sm" style={{ color: INK2 }}>{description}</p>
      <Separator className="mt-3" />
    </header>
  );
}

const SCHEDULE_ICONS: Record<string, LucideIcon> = {
  'friday-reminder': CalendarDays,
  'ayah-interval': AudioLines,
  'ai-quotes': Sparkles,
  'morning-adhkar': Sunrise,
  'evening-adhkar': Sunset,
};

/** Editable fields per schedule card (partial — server values shine through). */
interface SchedDraft {
  time?: string;
  intervalMin?: number;
  times?: string;
  morning?: string;
  evening?: string;
}

export default function SchedulesView(): ReactNode {
  const { toast } = useToast();
  const sched = useBotResource<{ schedules: ScheduleItem[] }>('/api/bot/schedules', 15000);
  const settingsRes = useBotResource<{ settings: BotSettings }>('/api/bot/settings', 60000);

  const save = useBotMutation<{ ok: true }>();
  // "<key>:save" | "<key>:switch" — which card control is busy
  const [acting, setActing] = useState<string | null>(null);

  // Draft overrides server values while editing; derived during render (no seed effect)
  const [draft, setDraft] = useState<SchedDraft>({});
  const schedules = sched.data?.schedules ?? [];
  const schedOf = (key: string): ScheduleItem | undefined => schedules.find((x) => x.key === key);
  const st = settingsRes.data?.settings ?? null;
  const time = draft.time ?? st?.fridayReminderTime ?? timeFromCron(schedOf('friday-reminder')?.cron);
  const intervalRaw = Number(st?.quranIntervalMin);
  const intervalMin =
    draft.intervalMin ?? (Number.isFinite(intervalRaw) && intervalRaw >= 10 ? Math.min(intervalRaw, 360) : 60);
  const times = draft.times ?? st?.aiQuoteTimes ?? timesFromCron(schedOf('ai-quotes')?.cron);
  const morning = draft.morning ?? timeFromCron(schedOf('morning-adhkar')?.cron);
  const evening = draft.evening ?? timeFromCron(schedOf('evening-adhkar')?.cron);

  const timesValid = TIMES_RE.test(times.trim());

  const saveConfig = async (item: ScheduleItem, config: Record<string, unknown>): Promise<void> => {
    setActing(`${item.key}:save`);
    const r = await save.run(() => api.put(`/api/bot/schedules/${item.key}`, { config }));
    setActing(null);
    if (r.ok) {
      toast({ title: 'حُفظ الإعداد', description: `اعتمد البوت تعديل «${item.title}»` });
      sched.refresh();
      settingsRes.refresh();
    } else {
      toast({ title: 'تعذّر الحفظ', description: r.error, variant: 'destructive' });
    }
  };

  const toggleEnabled = async (item: ScheduleItem): Promise<void> => {
    setActing(`${item.key}:switch`);
    const r = await save.run(() => api.put(`/api/bot/schedules/${item.key}`, { enabled: !item.enabled }));
    setActing(null);
    if (r.ok) {
      toast({
        title: !item.enabled ? `فُعِّل «${item.title}»` : `أُوقف «${item.title}»`,
        description: !item.enabled ? 'سيعمل البوت به تلقائيًا في موعده' : 'لن يعمل حتى تفعيله من جديد',
      });
      sched.refresh();
    } else {
      toast({ title: 'تعذّر تغيير الحالة', description: r.error, variant: 'destructive' });
    }
  };

  const showSkeleton = sched.loading && !sched.data;
  const showError = sched.error !== null && !sched.data;

  /** Per-key editor + save row; generic cards (unknown keys) render read-only. */
  const editorFor = (item: ScheduleItem): ReactNode => {
    switch (item.key) {
      case 'friday-reminder':
        return (
          <div className="space-y-2">
            <label htmlFor="sched-friday" className="text-sm" style={{ color: INK2 }}>وقت التذكير يوم الجمعة</label>
            <Input
              id="sched-friday"
              type="time"
              dir="ltr"
              className="max-w-40"
              value={time}
              onChange={(e) => setDraft((d) => ({ ...d, time: e.target.value }))}
              aria-label="وقت تذكير الجمعة"
            />
            <Button
              onClick={() => void saveConfig(item, { time })}
              disabled={time === '' || acting !== null}
              className="h-11 sm:h-9"
            >
              {acting === 'friday-reminder:save' ? <Loader2 className="animate-spin" aria-hidden /> : null}
              حفظ
            </Button>
          </div>
        );
      case 'ayah-interval':
        return (
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <label htmlFor="sched-interval" className="text-sm" style={{ color: INK2 }}>فاصل إرسال الآيات</label>
              <span className="font-medium tabular-nums" style={{ color: PRIMARY_DEEP }}>
                كل {arNum(intervalMin)} دقيقة
              </span>
            </div>
            <Slider
              id="sched-interval"
              value={[intervalMin]}
              min={10}
              max={360}
              step={10}
              onValueChange={(v) => setDraft((d) => ({ ...d, intervalMin: v[0] ?? intervalMin }))}
              aria-label="الفاصل بالدقائق"
            />
            <div className="flex justify-between text-xs tabular-nums" style={{ color: INK3 }}>
              <span>{arNum(10)} د</span>
              <span>{arNum(360)} د</span>
            </div>
            <Button
              onClick={() => void saveConfig(item, { intervalMin })}
              disabled={acting !== null}
              className="h-11 sm:h-9"
            >
              {acting === 'ayah-interval:save' ? <Loader2 className="animate-spin" aria-hidden /> : null}
              حفظ
            </Button>
          </div>
        );
      case 'ai-quotes':
        return (
          <div className="space-y-2">
            <label htmlFor="sched-times" className="text-sm" style={{ color: INK2 }}>أوقات إرسال الاقتباسات</label>
            <Input
              id="sched-times"
              dir="ltr"
              className="font-mono text-sm"
              style={{ fontFamily: MONO }}
              placeholder="08:00,14:00,20:00"
              value={times}
              onChange={(e) => setDraft((d) => ({ ...d, times: e.target.value }))}
              aria-label="أوقات الاقتباسات"
              aria-invalid={!timesValid}
            />
            <p className="text-xs" style={{ color: times.trim() !== '' && !timesValid ? DANGER : INK3 }}>
              {times.trim() !== '' && !timesValid
                ? 'أدخل أوقاتًا صحيحة بصيغة ٢٤ ساعة مفصولة بفواصل، مثل 08:00,14:00,20:00'
                : 'تُفصل الأوقات بفواصل — بتوقيت القاهرة'}
            </p>
            <Button
              onClick={() => void saveConfig(item, { times: times.trim() })}
              disabled={!timesValid || times.trim() === '' || acting !== null}
              className="h-11 sm:h-9"
            >
              {acting === 'ai-quotes:save' ? <Loader2 className="animate-spin" aria-hidden /> : null}
              حفظ
            </Button>
          </div>
        );
      case 'morning-adhkar':
      case 'evening-adhkar': {
        const value = item.key === 'morning-adhkar' ? morning : evening;
        return (
          <div className="space-y-2">
            <label htmlFor={`sched-${item.key}`} className="text-sm" style={{ color: INK2 }}>وقت الإرسال اليومي</label>
            <Input
              id={`sched-${item.key}`}
              type="time"
              dir="ltr"
              className="max-w-40"
              value={value}
              onChange={(e) => setDraft((d) => ({
                ...d,
                [item.key === 'morning-adhkar' ? 'morning' : 'evening']: e.target.value,
              }))}
              aria-label="وقت الإرسال"
            />
            <Button
              onClick={() => void saveConfig(item, { time: value })}
              disabled={value === '' || acting !== null}
              className="h-11 sm:h-9"
            >
              {acting === `${item.key}:save` ? <Loader2 className="animate-spin" aria-hidden /> : null}
              حفظ
            </Button>
          </div>
        );
      }
      default:
        return (
          <p className="text-sm" style={{ color: INK3 }}>
            تُدار هذه الجدولة من سيرفر البوت مباشرة.
          </p>
        );
    }
  };

  return (
    <div className="space-y-6">
      <ViewHeader
        title="المجدولات"
        description="أوقات التذكيرات والاقتباسات وبثّ الآيات — تعمل تلقائيًا على سيرفر البوت."
      />

      {showError ? (
        <Card style={{ borderColor: DANGER }}>
          <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
            <p className="font-medium" style={{ color: DANGER }}>تعذّر تحميل المجدولات</p>
            <p className="text-sm" style={{ color: INK2 }}>{sched.error}</p>
            <Button variant="outline" size="sm" onClick={sched.refresh}>
              <RefreshCw aria-hidden /> إعادة المحاولة
            </Button>
          </CardContent>
        </Card>
      ) : showSkeleton ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-52 w-full" />
          ))}
        </div>
      ) : schedules.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <Clock className="size-10" style={{ color: INK3 }} aria-hidden />
            <p className="font-medium" style={{ color: INK }}>لا مجدولات مُعرَّفة</p>
            <p className="max-w-sm text-sm" style={{ color: INK2 }}>
              تعمل المجدولات على سيرفر البوت — تأكد من تشغيل البوت واتصاله باللوحة.
            </p>
          </CardContent>
        </Card>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2" aria-label="قائمة المجدولات">
          {schedules.map((item) => {
            const Icon = SCHEDULE_ICONS[item.key] ?? Clock;
            const busy = acting !== null && acting.startsWith(`${item.key}:`);
            return (
              <li key={item.key}>
                <Card className="h-full">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <span
                          className="flex size-10 shrink-0 items-center justify-center rounded-md"
                          style={{ backgroundColor: PRIMARY_SOFT, color: PRIMARY_DEEP }}
                          aria-hidden
                        >
                          <Icon className="size-5" />
                        </span>
                        <div className="space-y-1">
                          <CardTitle className="text-base" style={{ color: INK }}>{item.title}</CardTitle>
                          <CardDescription className="leading-relaxed">{item.description}</CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <label className="sr-only" htmlFor={`sw-${item.key}`}>تفعيل {item.title}</label>
                        <Switch
                          id={`sw-${item.key}`}
                          checked={item.enabled}
                          disabled={busy}
                          onCheckedChange={() => void toggleEnabled(item)}
                          aria-label={`تفعيل ${item.title}`}
                        />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {editorFor(item)}
                    <div className="space-y-1 border-t pt-3 text-xs" style={{ borderColor: 'var(--color-line, var(--border))', color: INK2 }}>
                      <p>
                        آخر تشغيل: <span style={{ color: INK }}>{formatRelative(item.lastRunAt)}</span>
                      </p>
                      <p>
                        التشغيل القادم: <span style={{ color: INK }}>{formatRelative(item.nextRunAt)}</span>
                      </p>
                      <p dir="ltr" className="text-start font-mono" style={{ fontFamily: MONO, color: INK3 }}>
                        {item.cron}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <Card style={{ backgroundColor: PAPER2 }}>
        <CardContent className="flex items-center gap-3 p-4">
          <Clock className="size-5 shrink-0" style={{ color: PRIMARY_DEEP }} aria-hidden />
          <p className="text-sm" style={{ color: INK2 }}>
            الجدولة تعمل بتوقيت القاهرة <span dir="ltr">(Africa/Cairo)</span> على سيرفر البوت.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
