'use client';

/**
 * AiView — assistant identity, auto-reply behaviour, quote times,
 * and a live model test with real response timing.
 */
import { useState } from 'react';
import type { ReactNode } from 'react';
import { AlertTriangle, BrainCircuit, Loader2, RefreshCw, Send, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useBotMutation, useBotResource } from '@/components/panel/shared/hooks';
import { api } from '@/lib/browser-api';
import type { BotSettings } from '@/lib/types';

// ---- Theme tokens (var-only, with shadcn fallbacks) ----
const INK = 'var(--color-ink, var(--foreground))';
const INK2 = 'var(--color-ink-2, var(--muted-foreground))';
const INK3 = 'var(--color-ink-3, var(--muted-foreground))';
const PRIMARY_DEEP = 'var(--color-primary-deep, var(--primary))';
const DANGER = 'var(--color-danger, var(--destructive))';
const PRIMARY_SOFT = 'color-mix(in oklab, var(--color-primary, var(--primary)) 10%, var(--color-paper, var(--background)))';
const WARN_SOFT = 'color-mix(in oklab, var(--color-warn, var(--chart-4)) 14%, var(--color-paper, var(--background)))';
const WARN_DEEP = 'color-mix(in oklab, var(--color-warn, var(--chart-4)) 70%, var(--color-ink, var(--foreground)))';
const MONO = "var(--font-mono, 'IBM Plex Mono', monospace)";
const DISPLAY = "var(--font-display, 'Amiri', serif)";

const TIMES_RE = /^([01]?\d|2[0-3]):[0-5]?\d(\s*,\s*([01]?\d|2[0-3]):[0-5]?\d)*$/;

interface AiTestResult {
  reply: string;
  ms: number;
  prompt: string;
}

export default function AiView(): ReactNode {
  const { toast } = useToast();
  const settingsRes = useBotResource<{ settings: BotSettings }>('/api/bot/settings', 60000);

  // Draft overrides server values while editing; derived during render (no seed effect)
  const [draft, setDraft] = useState<{ autoReply?: boolean; preamble?: string; times?: string }>({});
  const s = settingsRes.data?.settings ?? null;
  const autoReply = draft.autoReply ?? s?.autoReply ?? false;
  const preamble = draft.preamble ?? s?.autoReplyPreamble ?? '';
  const times = draft.times ?? s?.aiQuoteTimes ?? '';

  const saveBehaviour = useBotMutation<{ ok: true }>();
  const saveTimes = useBotMutation<{ ok: true }>();
  const test = useBotMutation<{ reply: string; demo?: boolean }>();

  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState<AiTestResult | null>(null);

  const timesValid = TIMES_RE.test(times.trim());

  const persistBehaviour = async (): Promise<void> => {
    const r = await saveBehaviour.run(() =>
      api.put('/api/bot/settings', { autoReply, autoReplyPreamble: preamble }),
    );
    if (r.ok) {
      toast({ title: 'حُفظ سلوك المساعد', description: 'سيطبّقه البوت على الرسائل الخاصة القادمة' });
      settingsRes.refresh();
    } else {
      toast({ title: 'تعذّر الحفظ', description: r.error, variant: 'destructive' });
    }
  };

  const persistTimes = async (): Promise<void> => {
    const r = await saveTimes.run(() => api.put('/api/bot/settings', { aiQuoteTimes: times.trim() }));
    if (r.ok) {
      toast({ title: 'حُفظت أوقات الاقتباسات', description: 'سيرسل البوت الاقتباسات في مواعيدها' });
      settingsRes.refresh();
    } else {
      toast({ title: 'تعذّر الحفظ', description: r.error, variant: 'destructive' });
    }
  };

  const runTest = async (): Promise<void> => {
    if (!prompt.trim()) return;
    const startedAt = Date.now();
    const r = await test.run(() => api.post<{ reply: string; demo?: boolean }>('/api/bot/test/ai', { prompt: prompt.trim() }));
    if (r.ok) {
      setResult({ reply: r.reply ?? '', ms: Date.now() - startedAt, prompt: prompt.trim() });
    } else {
      toast({ title: 'تعذّر اختبار النموذج', description: r.error, variant: 'destructive' });
    }
  };

  const showSkeleton = settingsRes.loading && !settingsRes.data;
  const showError = settingsRes.error !== null && !settingsRes.data;

  return (
    <div className="space-y-6">
      <header className="space-y-1.5">
        <h1 className="text-2xl font-bold leading-tight sm:text-3xl" style={{ fontFamily: DISPLAY, color: INK }}>
          الذكاء الاصطناعي
        </h1>
        <p className="text-sm" style={{ color: INK2 }}>
          ضبط سلوك المساعد ونبرته، واختبار نموذج Hadith Ai-1.5 Flash Pro.
        </p>
        <Separator className="mt-3" />
      </header>

      {showError ? (
        <Card style={{ borderColor: DANGER }}>
          <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
            <p className="font-medium" style={{ color: DANGER }}>تعذّر تحميل إعدادات المساعد</p>
            <p className="text-sm" style={{ color: INK2 }}>{settingsRes.error}</p>
            <Button variant="outline" size="sm" onClick={settingsRes.refresh}>
              <RefreshCw aria-hidden /> إعادة المحاولة
            </Button>
          </CardContent>
        </Card>
      ) : showSkeleton ? (
        <div className="space-y-3">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
          {/* Identity + behaviour */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="flex size-10 items-center justify-center rounded-md"
                    style={{ backgroundColor: PRIMARY_SOFT, color: PRIMARY_DEEP }}
                    aria-hidden
                  >
                    <BrainCircuit className="size-5" />
                  </span>
                  <CardTitle className="text-lg" style={{ fontFamily: DISPLAY, color: INK }}>
                    Hadith Ai-1.5 Flash Pro
                  </CardTitle>
                  <Badge variant="secondary" className="gap-1.5">
                    <Sparkles className="size-3" aria-hidden /> مشغّل عبر Groq
                  </Badge>
                </div>
                <CardDescription className="leading-relaxed">
                  مساعد إسلامي يومي عام، غير متخصص في الفتاوى الفقهية — يحيل الأسئلة الفقهية المعقدة لأهل العلم.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <label htmlFor="ai-auto" className="text-sm font-medium" style={{ color: INK }}>
                      الرد التلقائي على الرسائل الخاصة
                    </label>
                    <p className="text-xs" style={{ color: INK3 }}>
                      يرد المساعد آليًا على كل من يراسل البوت مباشرة
                    </p>
                  </div>
                  <Switch
                    id="ai-auto"
                    checked={autoReply}
                    onCheckedChange={(v) => setDraft((d) => ({ ...d, autoReply: v }))}
                    aria-label="تفعيل الرد التلقائي"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="ai-preamble" className="text-sm" style={{ color: INK2 }}>
                    نبرة المساعد / مقدمة الرد
                  </label>
                  <Textarea
                    id="ai-preamble"
                    dir="rtl"
                    rows={4}
                    value={preamble}
                    onChange={(e) => setDraft((d) => ({ ...d, preamble: e.target.value }))}
                    placeholder="مثال: السلام عليكم ورحمة الله، أنا مساعدك اليومي من منظمة حديث الإسلامية…"
                    aria-label="نبرة المساعد ومقدمة الرد"
                  />
                  <p className="text-xs" style={{ color: INK3 }}>
                    تُقرأ قبل صياغة كل رد لتضبط نبرة المساعد وأسلوبه.
                  </p>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={() => void persistBehaviour()}
                    disabled={saveBehaviour.busy}
                    className="h-11 sm:h-9"
                  >
                    {saveBehaviour.busy ? <Loader2 className="animate-spin" aria-hidden /> : null}
                    حفظ السلوك
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quote times */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base" style={{ color: INK }}>أوقات الاقتباسات</CardTitle>
                <CardDescription>مواعيد إرسال الاقتباسات الإسلامية اليومية.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  dir="ltr"
                  className="font-mono text-sm"
                  style={{ fontFamily: MONO }}
                  placeholder="08:00,14:00,20:00"
                  value={times}
                  onChange={(e) => setDraft((d) => ({ ...d, times: e.target.value }))}
                  aria-label="أوقات الاقتباسات"
                  aria-invalid={!timesValid}
                />
                <p className="text-xs" style={{ color: times !== '' && !timesValid ? DANGER : INK3 }}>
                  {times !== '' && !timesValid
                    ? 'أدخل أوقاتًا صحيحة بصيغة ٢٤ ساعة مفصولة بفواصل'
                    : 'تُفصل الأوقات بفواصل — بتوقيت القاهرة'}
                </p>
                <div className="flex justify-end">
                  <Button
                    onClick={() => void persistTimes()}
                    disabled={!timesValid || times.trim() === '' || saveTimes.busy}
                    className="h-11 sm:h-9"
                  >
                    {saveTimes.busy ? <Loader2 className="animate-spin" aria-hidden /> : null}
                    حفظ الأوقات
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Model test */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base" style={{ color: INK }}>اختبار النموذج</CardTitle>
                <CardDescription>اطرح سؤالًا لترى ردّ المساعد وزمن استجابته الفعلي.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="ai-prompt" className="text-sm" style={{ color: INK2 }}>السؤال</label>
                  <div className="flex gap-2">
                    <Input
                      id="ai-prompt"
                      dir="rtl"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="مثال: ذكّرني بفضل الصلاة على النبي ﷺ"
                      aria-label="سؤال الاختبار"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') void runTest();
                      }}
                    />
                    <Button
                      onClick={() => void runTest()}
                      disabled={!prompt.trim() || test.busy}
                      className="h-11 shrink-0 px-4 sm:h-9"
                    >
                      {test.busy ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}
                      اختبر الرد
                    </Button>
                  </div>
                </div>

                {test.busy && <Skeleton className="h-24 w-full" />}

                {result !== null && !test.busy && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium" style={{ color: INK }}>ردّ المساعد</span>
                      <span
                        dir="ltr"
                        className="font-mono text-xs tabular-nums"
                        style={{ fontFamily: MONO, color: INK2 }}
                      >
                        {result.ms} ms
                      </span>
                    </div>
                    <div
                      dir="rtl"
                      className="rounded-2xl rounded-ss-sm border p-4 text-sm leading-relaxed"
                      style={{ backgroundColor: PRIMARY_SOFT, borderColor: 'var(--color-line, var(--border))', color: INK }}
                    >
                      <p className="mb-2 text-xs" style={{ color: INK2 }}>{result.prompt}</p>
                      <p dir="auto">{result.reply}</p>
                    </div>
                  </div>
                )}

                {result === null && !test.busy && (
                  <p className="text-sm" style={{ color: INK3 }}>
                    ستظهر نتيجة الاختبار هنا مع زمن الاستجابة.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Jurisprudence disclaimer */}
            <Card style={{ backgroundColor: WARN_SOFT, borderColor: WARN_DEEP }}>
              <CardContent className="flex items-start gap-3 p-4">
                <AlertTriangle className="mt-0.5 size-5 shrink-0" style={{ color: WARN_DEEP }} aria-hidden />
                <p className="text-sm leading-relaxed" style={{ color: INK }}>
                  البوت لا يُصدر فتاوى فقهية — دورُه التذكير والمرافقة اليومية.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
