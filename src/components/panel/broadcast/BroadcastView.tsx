'use client';

/**
 * BroadcastView — markdown broadcast composer with a live WhatsApp-style
 * preview, targeting, and a delivery history feed.
 */
import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { CalendarDays, Check, Code, History, List, Loader2, Megaphone, Send, X } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useBotMutation, useBotResource } from '@/components/panel/shared/hooks';
import { api } from '@/lib/browser-api';
import type { BroadcastRecord, BotStatus } from '@/lib/types';

// ---- Theme tokens (var-only, with shadcn fallbacks) ----
const INK = 'var(--color-ink, var(--foreground))';
const INK2 = 'var(--color-ink-2, var(--muted-foreground))';
const INK3 = 'var(--color-ink-3, var(--muted-foreground))';
const LINE = 'var(--color-line, var(--border))';
const PRIMARY_DEEP = 'var(--color-primary-deep, var(--primary))';
const SUCCESS = 'var(--color-success, var(--color-primary))';
const DANGER = 'var(--color-danger, var(--destructive))';
const MONO = "var(--font-mono, 'IBM Plex Mono', monospace)";
const DISPLAY = "var(--font-display, 'Amiri', serif)";

type Targets = 'all' | 'users' | 'groups';

const TARGET_LABEL: Record<Targets, string> = {
  all: 'جميع الجهات',
  users: 'المستخدمون فقط',
  groups: 'الجروبات فقط',
};

const arNum = (n: number): string => n.toLocaleString('ar-EG');

const dtf = new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium', timeStyle: 'short' });
function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : dtf.format(d);
}

/** Dignified editable Friday-reminder draft (WhatsApp markdown). */
const FRIDAY_DRAFT = `*﷽*

السلام عليكم ورحمة الله وبركاته، وجمعةٌ مباركة 🌿

من سنن يوم الجمعة وفضائله:
• قراءة *سورة الكهف* — «من قرأ سورة الكهف في يوم الجمعة أضاء له من النور ما بين الجمعتين»
• الإكثار من *الصلاة على النبي ﷺ* في هذا اليوم المبارك
• *التبكير إلى الصلاة* والإنصات حتى تُقضى

نسأل الله أن يتقبل منا ومنكم صالح الأعمال 🤲

_منظمة حديث الإسلامية — Hadith Ai.BOT_`;

// ---- WhatsApp markdown → React nodes (XSS-safe: no dangerouslySetInnerHTML) ----

type Segment = { kind: 'text' | 'bold' | 'italic' | 'code'; content: string };

function parseInline(line: string): Segment[] {
  const out: Segment[] = [];
  // ```code``` first, then *bold*, then _italic_ (flat, like WhatsApp)
  line.split(/```/).forEach((codePart, ci) => {
    if (ci % 2 === 1) {
      if (codePart !== '') out.push({ kind: 'code', content: codePart });
      return;
    }
    codePart.split(/\*([^*\n]+)\*/).forEach((boldPart, bi) => {
      if (bi % 2 === 1) {
        out.push({ kind: 'bold', content: boldPart });
        return;
      }
      boldPart.split(/_([^_\n]+)_/).forEach((italPart, ii) => {
        if (ii % 2 === 1) out.push({ kind: 'italic', content: italPart });
        else if (italPart !== '') out.push({ kind: 'text', content: italPart });
      });
    });
  });
  return out;
}

function renderSegments(line: string): ReactNode {
  return parseInline(line).map((s, i) => {
    if (s.kind === 'bold') return <b key={i}>{s.content}</b>;
    if (s.kind === 'italic') return <i key={i}>{s.content}</i>;
    if (s.kind === 'code') {
      return (
        <code
          key={i}
          dir="auto"
          className="rounded px-1 py-0.5 text-[0.85em]"
          style={{ fontFamily: MONO, backgroundColor: 'color-mix(in oklab, var(--color-ink, var(--foreground)) 10%, var(--color-paper, var(--background)))' }}
        >
          {s.content}
        </code>
      );
    }
    return <span key={i}>{s.content}</span>;
  });
}

function renderWhatsAppMarkdown(text: string): ReactNode {
  return (
    <div className="space-y-1.5">
      {text.split('\n').map((line, i) => {
        if (line.trim() === '') return <div key={i} aria-hidden className="h-1.5" />;
        if (/^\s*•\s+/.test(line)) {
          return (
            <p key={i} dir="auto" className="leading-relaxed">
              {renderSegments(line.replace(/^\s*•\s+/, '• '))}
            </p>
          );
        }
        return (
          <p key={i} dir="auto" className="leading-relaxed">
            {renderSegments(line)}
          </p>
        );
      })}
    </div>
  );
}

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

export default function BroadcastView(): ReactNode {
  const { toast } = useToast();
  const [text, setText] = useState('');
  const [targets, setTargets] = useState<Targets>('all');
  const taRef = useRef<HTMLTextAreaElement>(null);

  const bcast = useBotMutation<{ sent: number; failed: number }>();
  const history = useBotResource<{ broadcasts: BroadcastRecord[] }>('/api/bot/broadcasts', 20000);
  // Real target counts come from the bot status (never invented)
  const status = useBotResource<BotStatus>('/api/bot/status', 30000);

  const stats = status.data?.stats ?? null;
  const expected =
    stats === null
      ? null
      : targets === 'users'
        ? stats.users
        : targets === 'groups'
          ? stats.groups
          : stats.users + stats.groups;

  // ---- Selection-aware formatting helpers ----
  const restoreSelection = (el: HTMLTextAreaElement, start: number, end: number): void => {
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start, end);
    });
  };

  const applyWrap = (before: string, after: string): void => {
    const ta = taRef.current;
    if (!ta) return;
    const { selectionStart: s, selectionEnd: e } = ta;
    const sel = text.slice(s, e) || 'نص';
    setText(text.slice(0, s) + before + sel + after + text.slice(e));
    restoreSelection(ta, s + before.length, s + before.length + sel.length);
  };

  const applyBullet = (): void => {
    const ta = taRef.current;
    if (!ta) return;
    const { selectionStart: s, selectionEnd: e } = ta;
    const lineStart = text.lastIndexOf('\n', Math.max(s - 1, 0)) + 1;
    const nl = text.indexOf('\n', e);
    const lineEnd = nl === -1 ? text.length : nl;
    const block = text.slice(lineStart, lineEnd);
    const lines = block.split('\n');
    const allBulleted = lines.every((l) => l.trim() === '' || /^\s*•\s+/.test(l));
    const updated = lines
      .map((l) => (allBulleted ? l.replace(/^(\s*)•\s+/, '$1') : l.trim() === '' || /^\s*•\s+/.test(l) ? l : `• ${l}`))
      .join('\n');
    setText(text.slice(0, lineStart) + updated + text.slice(lineEnd));
    restoreSelection(ta, lineStart, lineStart + updated.length);
  };

  const sendBroadcast = async (): Promise<void> => {
    if (!text.trim()) return;
    const r = await bcast.run(() =>
      api.post<{ sent: number; failed: number }>('/api/bot/broadcast', {
        text: text.trim(),
        targets,
        format: 'markdown',
      }),
    );
    if (r.ok) {
      toast({
        title: `تم البث إلى ${arNum(r.sent)} جهة`,
        description: r.failed > 0 ? `تعذّر الوصول إلى ${arNum(r.failed)} جهة` : 'وصلت الرسالة إلى جميع الجهات المستهدفة',
      });
      history.refresh();
      status.refresh();
    } else {
      toast({ title: 'تعذّر إرسال البث', description: r.error, variant: 'destructive' });
    }
  };

  const nowTime = new Intl.DateTimeFormat('ar-EG', { hour: '2-digit', minute: '2-digit' }).format(new Date());
  const broadcasts = history.data?.broadcasts ?? [];

  return (
    <div className="space-y-6">
      <ViewHeader
        title="البث والرسائل"
        description="صياغة رسائل بتنسيق واتساب وبثّها للمشتركين أو الجروبات."
      />

      <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
        {/* ---- Composer ---- */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg" style={{ fontFamily: DISPLAY, color: INK }}>محرر الرسالة</CardTitle>
            <CardDescription>
              تنسيق واتساب: <b className="font-semibold">*غامق*</b> · <i className="italic">_مائل_</i> · <code dir="ltr" className="font-mono text-xs" style={{ fontFamily: MONO }}>```رمز```</code> · «• » للقوائم
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Mini formatting toolbar — mousedown is prevented to keep the selection */}
            <div className="flex flex-wrap items-center gap-1.5" role="toolbar" aria-label="أدوات التنسيق">
              <Button
                variant="outline"
                size="icon"
                className="size-11 sm:size-9"
                aria-label="تنسيق غامق"
                title="تنسيق غامق"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyWrap('*', '*')}
              >
                <span className="font-bold">B</span>
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-11 sm:size-9"
                aria-label="تنسيق مائل"
                title="تنسيق مائل"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyWrap('_', '_')}
              >
                <span className="font-serif italic">I</span>
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-11 sm:size-9"
                aria-label="تنسيق رمز برمجي"
                title="تنسيق رمز برمجي"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyWrap('```', '```')}
              >
                <Code aria-hidden />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-11 sm:size-9"
                aria-label="إدراج قائمة نقطية"
                title="إدراج قائمة نقطية"
                onMouseDown={(e) => e.preventDefault()}
                onClick={applyBullet}
              >
                <List aria-hidden />
              </Button>
              <Separator orientation="vertical" className="mx-1 hidden h-6 sm:block" />
              <Button
                variant="ghost"
                size="sm"
                className="h-11 gap-2 sm:h-9"
                onClick={() => {
                  setText(FRIDAY_DRAFT);
                  taRef.current?.focus();
                }}
              >
                <CalendarDays aria-hidden /> تذكير الجمعة
              </Button>
            </div>

            <Textarea
              ref={taRef}
              dir="rtl"
              rows={8}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="اكتب رسالة البث هنا… يمكنك استخدام *الغامق* و_المائل_ والقوائم."
              aria-label="نص رسالة البث"
              className="text-base leading-relaxed"
            />

            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <div className="space-y-1.5">
                <label htmlFor="bcast-targets" className="text-sm" style={{ color: INK2 }}>الاستهداف</label>
                <Select value={targets} onValueChange={(v) => setTargets(v as Targets)}>
                  <SelectTrigger id="bcast-targets" className="h-11 w-full sm:h-9" aria-label="استهداف البث">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الجهات</SelectItem>
                    <SelectItem value="users">المستخدمون فقط</SelectItem>
                    <SelectItem value="groups">الجروبات فقط</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    disabled={!text.trim() || bcast.busy}
                    className="h-11 w-full sm:h-9 sm:w-auto"
                  >
                    {bcast.busy ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}
                    إرسال البث
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent dir="rtl">
                  <AlertDialogHeader>
                    <AlertDialogTitle style={{ fontFamily: DISPLAY }}>تأكيد إرسال البث</AlertDialogTitle>
                    <AlertDialogDescription>
                      سيُرسل إلى{' '}
                      <b className="font-semibold">{expected !== null ? `${arNum(expected)} جهة تقريبًا` : 'الجهات المستهدفة'}</b>{' '}
                      بصيغة واتساب. لا يمكن التراجع بعد الإرسال.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="gap-2">
                    <AlertDialogCancel disabled={bcast.busy}>إلغاء</AlertDialogCancel>
                    <AlertDialogAction onClick={() => void sendBroadcast()} disabled={bcast.busy}>
                      {bcast.busy ? <Loader2 className="animate-spin" aria-hidden /> : <Megaphone aria-hidden />}
                      إرسال الآن
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>

        {/* ---- WhatsApp-style preview ---- */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg" style={{ fontFamily: DISPLAY, color: INK }}>معاينة واتساب</CardTitle>
            <CardDescription>هكذا ستظهر الرسالة عند المستقبل — قبل الإرسال.</CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className="rounded-xl p-4 sm:p-5"
              style={{ backgroundColor: 'color-mix(in oklab, var(--color-ink, var(--foreground)) 6%, var(--color-paper, var(--background)))' }}
              aria-label="معاينة الرسالة"
            >
              {text.trim() === '' ? (
                <p className="py-6 text-center text-sm" style={{ color: INK3 }}>
                  اكتب رسالتك في المحرر لتظهر المعاينة هنا
                </p>
              ) : (
                // A single content bubble — deliberately no fake browser chrome
                <div
                  dir="rtl"
                  className="ms-auto max-w-[90%] rounded-2xl rounded-ss-sm border p-3.5 shadow-xs sm:p-4"
                  style={{ backgroundColor: 'var(--color-paper, var(--background))', borderColor: LINE }}
                >
                  <div className="text-[15px]" style={{ color: INK }}>{renderWhatsAppMarkdown(text)}</div>
                  <p className="mt-2 text-end text-[11px]" style={{ color: INK3 }}>{nowTime} ✓✓</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ---- History ---- */}
      <section aria-label="سجل البث" className="space-y-4">
        <div className="flex items-center gap-2">
          <History className="size-5" style={{ color: PRIMARY_DEEP }} aria-hidden />
          <h2 className="text-lg font-semibold" style={{ fontFamily: DISPLAY, color: INK }}>سجل البث</h2>
        </div>

        {history.error !== null && !history.data ? (
          <Card style={{ borderColor: DANGER }}>
            <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
              <p className="font-medium" style={{ color: DANGER }}>تعذّر تحميل سجل البث</p>
              <p className="text-sm" style={{ color: INK2 }}>{history.error}</p>
              <Button variant="outline" size="sm" onClick={history.refresh}>
                إعادة المحاولة
              </Button>
            </CardContent>
          </Card>
        ) : history.loading && !history.data ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : broadcasts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
              <Megaphone className="size-10" style={{ color: INK3 }} aria-hidden />
              <p className="font-medium" style={{ color: INK }}>لا عمليات بث بعد</p>
              <p className="max-w-sm text-sm" style={{ color: INK2 }}>
                أرسل أول رسالة لتظهر هنا مع عدد الجهات التي وصلتها.
              </p>
            </CardContent>
          </Card>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {broadcasts.map((b) => (
              <li key={b.id}>
                <Card className="h-full py-3">
                  <CardContent className="space-y-2 px-4">
                    <p className="line-clamp-2 text-sm leading-relaxed" dir="auto" style={{ color: INK }}>
                      {b.text}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs" style={{ color: INK2 }}>
                      <Badge variant="secondary">{TARGET_LABEL[b.targets] ?? b.targets}</Badge>
                      <span className="flex items-center gap-1" style={{ color: SUCCESS }}>
                        <Check className="size-3" aria-hidden /> أُرسل إلى {arNum(b.sent)}
                      </span>
                      {b.failed > 0 && (
                        <span className="flex items-center gap-1" style={{ color: DANGER }}>
                          <X className="size-3" aria-hidden /> فشل {arNum(b.failed)}
                        </span>
                      )}
                      <span className="ms-auto">{formatDateTime(b.sentAt)}</span>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
