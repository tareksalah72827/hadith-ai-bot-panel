'use client';

/**
 * Overview view: greeting + real Gregorian date, 4 stat cards, connection
 * status, quick actions (send ayah / quote now), and the last 6 log entries.
 * Data comes from the panel proxies; when the bot is unreachable the view
 * shows honest error and empty states only.
 */
import { type ReactNode } from 'react';
import {
  BookOpen,
  Loader2,
  Megaphone,
  RefreshCw,
  Send,
  Sparkles,
  Users,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';
import { formatUptime, useBotMutation, useBotResource } from '@/components/panel/shared/hooks';
import { api } from '@/lib/browser-api';
import type { AyahPreview, BotStatus, LogEntry } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

type LogsResponse = { logs: LogEntry[] };
type SendNowResponse = { ayah?: AyahPreview; quote?: string; message?: string };

const SKELETON_BG = { backgroundColor: 'var(--color-paper-3)' };

function formatNum(n: number | undefined): string {
  return typeof n === 'number' && Number.isFinite(n) ? n.toLocaleString('en-US') : '—';
}

function truncateText(t: string, max = 80): string {
  const clean = t.replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

function formatLogTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('ar-EG', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

const LEVEL_LABEL: Record<LogEntry['level'], string> = {
  info: 'معلومة',
  warn: 'تحذير',
  error: 'خطأ',
};

function LevelBadge({ level }: { level: LogEntry['level'] }) {
  const cls =
    level === 'error'
      ? 'bg-[var(--color-danger)] text-[var(--color-paper)]'
      : level === 'warn'
        ? 'bg-[var(--color-warn)] text-[var(--color-ink)]'
        : 'bg-[var(--color-paper-3)] text-[var(--color-ink-2)]';
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${cls}`}>
      {LEVEL_LABEL[level]}
    </span>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  desc,
  loading,
}: {
  icon: LucideIcon;
  label: string;
  value: number | undefined;
  desc: string;
  loading: boolean;
}) {
  return (
    <Card className="gap-0 rounded-[var(--radius-md)] border-[var(--color-line)] bg-[var(--color-paper-2)] py-4 shadow-none">
      <CardContent className="flex flex-col gap-3 px-4">
        <div className="flex items-center gap-3">
          <span
            className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-paper-3)] text-[var(--color-primary)]"
            aria-hidden="true"
          >
            <Icon className="size-5" />
          </span>
          <p className="min-w-0 truncate text-sm font-medium text-[var(--color-ink-2)]">{label}</p>
        </div>
        {loading ? (
          <Skeleton className="h-9 w-24" style={SKELETON_BG} />
        ) : (
          <p
            className="text-3xl font-semibold leading-none text-[var(--color-ink)]"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {formatNum(value)}
          </p>
        )}
        <p className="text-xs text-[var(--color-ink-3)]">{desc}</p>
      </CardContent>
    </Card>
  );
}

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div
      className="flex items-center justify-between gap-3 border-b py-2.5 last:border-b-0"
      style={{ borderColor: 'var(--color-line)' }}
    >
      <dt className="shrink-0 text-[var(--color-ink-3)]">{label}</dt>
      <dd className="min-w-0 truncate font-medium text-[var(--color-ink)]">{children}</dd>
    </div>
  );
}

export default function DashboardView({ onNavigate }: { onNavigate: (view: string) => void }) {
  const { toast } = useToast();
  const status = useBotResource<BotStatus>('/api/bot/status', 15000);
  const logsRes = useBotResource<LogsResponse>('/api/bot/logs?limit=6', 20000);
  const ayahM = useBotMutation<SendNowResponse>();
  const quoteM = useBotMutation<SendNowResponse>();

  // Real Gregorian date in Arabic — computed at render; SSR/client drift is
  // suppressed and corrected on the first data-driven re-render.
  const dateStr = new Intl.DateTimeFormat('ar-EG', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  const s = status.data?.stats;
  const statsLoading = status.loading && !status.data;
  const connected = status.data?.connected === true;
  const connecting = status.data?.connecting === true;
  const logs = logsRes.data?.logs ?? [];
  const pendingGroups = s?.pendingGroups ?? 0;

  async function sendAyah() {
    const r = await ayahM.run(() => api.post<SendNowResponse>('/api/bot/quran/send-now'));
    if (r.ok) {
      const a = r.ayah;
      toast({
        title: 'تم إرسال الآية',
        description: a
          ? a.surahName
            ? `سورة ${a.surahName} — الآية ${a.ayah}`
            : `الآية ${a.surah}:${a.ayah}`
          : 'أُرسلت إلى المشتركين',
      });
    } else {
      toast({ title: 'تعذّر إرسال الآية', description: r.error, variant: 'destructive' });
    }
  }

  async function sendQuote() {
    const r = await quoteM.run(() => api.post<SendNowResponse>('/api/bot/quote/send-now'));
    if (r.ok) {
      toast({
        title: 'تم إرسال الاقتباس',
        description: typeof r.quote === 'string' ? truncateText(r.quote, 60) : 'أُرسل إلى المشتركين',
      });
    } else {
      toast({ title: 'تعذّر إرسال الاقتباس', description: r.error, variant: 'destructive' });
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-4 md:gap-6">
      {/* Greeting */}
      <section className="flex flex-wrap items-end justify-between gap-2" aria-labelledby="dash-greeting">
        <div className="min-w-0">
          <h2
            id="dash-greeting"
            className="text-2xl font-bold leading-relaxed text-[var(--color-ink)] md:text-3xl"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            السلام عليكم ورحمة الله
          </h2>
          <p className="mt-1 text-sm text-[var(--color-ink-3)]" suppressHydrationWarning>
            {dateStr} — نظرة عامة على أداء Hadith Ai.BOT
          </p>
        </div>
      </section>

      {status.error && !status.data && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-md)] border px-4 py-3 text-sm"
          style={{
            borderColor: 'var(--color-danger)',
            backgroundColor: 'color-mix(in oklab, var(--color-danger) 8%, transparent)',
            color: 'var(--color-danger)',
          }}
        >
          <span className="min-w-0">تعذّر تحميل حالة البوت: {status.error}</span>
          <Button variant="outline" size="sm" onClick={status.refresh} className="border-[var(--color-line)]">
            <RefreshCw className="size-3.5" aria-hidden="true" />
            إعادة المحاولة
          </Button>
        </div>
      )}

      {/* Stat cards */}
      <section aria-label="الإحصائيات" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} label="المستخدمون" value={s?.users} desc="إجمالي المستخدمين المسجلين" loading={statsLoading} />
        <StatCard icon={UsersRound} label="الجروبات" value={s?.groups} desc="الجروبات المعتمدة النشطة" loading={statsLoading} />
        <StatCard icon={Send} label="الرسائل المرسلة" value={s?.messagesSent} desc="إجمالي الرسائل منذ التشغيل" loading={statsLoading} />
        <StatCard icon={BookOpen} label="الآيات المرسلة" value={s?.ayahSent} desc="الآيات القرآنية المرسلة بصوت الشيخ رعد الكردي" loading={statsLoading} />
      </section>

      {/* Connection + quick actions + recent activity */}
      <section aria-label="الحالة والإجراءات" className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Connection status */}
        <Card className="gap-0 rounded-[var(--radius-md)] border-[var(--color-line)] bg-[var(--color-paper-2)] py-4 shadow-none">
          <CardHeader className="gap-0 px-4 pb-3">
            <CardTitle className="text-base text-[var(--color-ink)]">حالة الاتصال</CardTitle>
            <CardDescription className="text-xs text-[var(--color-ink-3)]">جلسة واتساب الحالية للبوت</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 px-4">
            {statsLoading ? (
              <div className="flex flex-col gap-2 py-2">
                <Skeleton className="h-5 w-2/3" style={SKELETON_BG} />
                <Skeleton className="h-5 w-1/2" style={SKELETON_BG} />
                <Skeleton className="h-5 w-3/5" style={SKELETON_BG} />
              </div>
            ) : (
              <dl className="flex flex-col text-sm">
                <InfoRow label="الحالة">
                  <span
                    className="font-medium"
                    style={{ color: connected ? 'var(--color-success)' : connecting ? 'var(--color-warn)' : 'var(--color-ink-3)' }}
                  >
                    {connected ? 'متصل' : connecting ? 'جارٍ الاتصال' : 'غير متصل'}
                  </span>
                </InfoRow>
                <InfoRow label="الرقم المرتبط">
                  <span dir="ltr" style={{ fontFamily: 'var(--font-mono)' }}>
                    {status.data?.me?.number ?? '—'}
                  </span>
                </InfoRow>
                <InfoRow label="مدة التشغيل">
                  {formatUptime(status.data?.uptimeSec ?? Number.NaN)}
                </InfoRow>
                <InfoRow label="إصدار البوت">
                  <span dir="ltr" style={{ fontFamily: 'var(--font-mono)' }}>
                    {status.data?.version ?? '—'}
                  </span>
                </InfoRow>
              </dl>
            )}
            <Button
              variant="outline"
              onClick={() => onNavigate('connection')}
              className="mt-4 w-full border-[var(--color-line)]"
            >
              <RefreshCw className="size-4" aria-hidden="true" />
              إدارة الاتصال
            </Button>
          </CardContent>
        </Card>

        {/* Quick actions */}
        <Card className="gap-0 rounded-[var(--radius-md)] border-[var(--color-line)] bg-[var(--color-paper-2)] py-4 shadow-none">
          <CardHeader className="gap-0 px-4 pb-3">
            <CardTitle className="text-base text-[var(--color-ink)]">إجراءات سريعة</CardTitle>
            <CardDescription className="text-xs text-[var(--color-ink-3)]">مهام فورية بنقرة واحدة</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2.5 px-4">
            <Button
              onClick={sendAyah}
              disabled={ayahM.busy}
              className="h-11 justify-start gap-3 bg-[var(--color-primary)] text-[var(--color-paper)] hover:bg-[var(--color-primary-deep)]"
            >
              {ayahM.busy ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <BookOpen className="size-4" aria-hidden="true" />
              )}
              <span className="min-w-0 flex-1 truncate text-start">
                {ayahM.busy ? 'جارٍ إرسال الآية…' : 'إرسال آية الآن'}
              </span>
            </Button>
            <Button
              onClick={sendQuote}
              disabled={quoteM.busy}
              variant="outline"
              className="h-11 justify-start gap-3 border-[var(--color-line)]"
            >
              {quoteM.busy ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles className="size-4" aria-hidden="true" />
              )}
              <span className="min-w-0 flex-1 truncate text-start">
                {quoteM.busy ? 'جارٍ إرسال الاقتباس…' : 'اقتباس فوري'}
              </span>
            </Button>
            <Button
              variant="outline"
              onClick={() => onNavigate('broadcast')}
              className="h-11 justify-start gap-3 border-[var(--color-line)]"
            >
              <Megaphone className="size-4" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-start">بث رسالة</span>
            </Button>
            {pendingGroups > 0 && (
              <Button
                variant="outline"
                onClick={() => onNavigate('groups')}
                className="h-11 justify-start gap-3 border-[var(--color-accent)] text-[var(--color-accent-deep)]"
              >
                <UsersRound className="size-4" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-start">الموافقة على الجروبات</span>
                <span
                  className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)] px-1.5 text-[11px] font-semibold text-[var(--color-ink)]"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  {pendingGroups > 99 ? '99+' : pendingGroups}
                </span>
              </Button>
            )}
            {(ayahM.error || quoteM.error) && (
              <p role="alert" className="text-xs leading-relaxed text-[var(--color-danger)]">
                {ayahM.error ?? quoteM.error}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent activity */}
        <Card className="gap-0 rounded-[var(--radius-md)] border-[var(--color-line)] bg-[var(--color-paper-2)] py-4 shadow-none">
          <CardHeader className="gap-0 px-4 pb-3">
            <CardTitle className="text-base text-[var(--color-ink)]">آخر النشاط</CardTitle>
            <CardDescription className="text-xs text-[var(--color-ink-3)]">أحدث 6 سجلات من البوت</CardDescription>
          </CardHeader>
          <CardContent className="px-4">
            {logsRes.loading && !logsRes.data ? (
              <div className="flex flex-col gap-2" aria-hidden="true">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-6 w-full" style={SKELETON_BG} />
                ))}
              </div>
            ) : logs.length === 0 ? (
              <p className="py-6 text-center text-sm leading-relaxed text-[var(--color-ink-3)]">
                {logsRes.error ? `تعذّر تحميل السجلات: ${logsRes.error}` : 'لا توجد سجلات بعد'}
              </p>
            ) : (
              <ul className="hadith-scroll max-h-96 overflow-y-auto pe-1" aria-label="آخر السجلات">
                {logs.map((log) => (
                  <li
                    key={log.id}
                    className="flex items-start gap-2 border-b py-2.5 last:border-b-0"
                    style={{ borderColor: 'var(--color-line)' }}
                  >
                    <time
                      className="shrink-0 pt-0.5 text-[11px] text-[var(--color-ink-3)]"
                      dir="ltr"
                      style={{ fontFamily: 'var(--font-mono)' }}
                    >
                      {formatLogTime(log.at)}
                    </time>
                    <LevelBadge level={log.level} />
                    <p className="min-w-0 flex-1 break-words text-sm leading-snug text-[var(--color-ink-2)]">
                      {truncateText(log.message)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
