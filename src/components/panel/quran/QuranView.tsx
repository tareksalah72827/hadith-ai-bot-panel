'use client';

/**
 * QuranView — settings for the periodic audio-ayah broadcast (reciter,
 * surah range, interval) plus an ayah preview / send-now action.
 */
import { useState } from 'react';
import type { ReactNode } from 'react';
import { AudioLines, BookOpen, Eye, Loader2, RefreshCw, Send, Volume2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { useBotMutation, useBotResource } from '@/components/panel/shared/hooks';
import { api } from '@/lib/browser-api';
import type { AyahPreview, BotSettings } from '@/lib/types';

// ---- Theme tokens (var-only, with shadcn fallbacks) ----
const INK = 'var(--color-ink, var(--foreground))';
const INK2 = 'var(--color-ink-2, var(--muted-foreground))';
const INK3 = 'var(--color-ink-3, var(--muted-foreground))';
const PRIMARY_DEEP = 'var(--color-primary-deep, var(--primary))';
const DANGER = 'var(--color-danger, var(--destructive))';
const ACCENT = 'var(--color-accent, var(--accent))';
const ACCENT_DEEP = 'var(--color-accent-deep, var(--accent-foreground))';
const SUCCESS_SOFT = 'color-mix(in oklab, var(--color-success, var(--color-primary)) 14%, var(--color-paper, var(--background)))';
const MONO = "var(--font-mono, 'IBM Plex Mono', monospace)";
const DISPLAY = "var(--font-display, 'Amiri', serif)";

const arNum = (n: number): string => n.toLocaleString('ar-EG');

/** Converts Arabic-Indic digits to Latin so range parsing is shape-agnostic. */
function toLatinDigits(s: string): string {
  return s.replace(/[\u0660-\u0669\u06F0-\u06F9]/g, (d) => {
    const code = d.codePointAt(0) ?? 0;
    const base = code >= 0x06f0 ? 0x06f0 : 0x0660;
    return String(code - base);
  });
}

/** "from"/"to" surah numbers from a range string like "1-60" (Arabic digits tolerated). */
function parseSurahRange(range: string | undefined): { from: string; to: string } {
  const m = toLatinDigits(String(range ?? '')).match(/(\d{1,3})\D+(\d{1,3})/);
  return { from: m?.[1] ?? '', to: m?.[2] ?? '' };
}

export default function QuranView(): ReactNode {
  const { toast } = useToast();
  const settingsRes = useBotResource<{ settings: BotSettings }>('/api/bot/settings', 60000);

  // The bot's own reciter identifier is passed through untouched
  const reciterId = settingsRes.data?.settings.reciter ?? 'ar.raadalkurdi';

  // Draft overrides server values while editing; derived during render (no seed effect)
  const [draft, setDraft] = useState<{ from?: string; to?: string; intervalMin?: number }>({});
  const s = settingsRes.data?.settings ?? null;
  const parsed = parseSurahRange(s?.surahRange);
  const from = draft.from ?? parsed.from;
  const to = draft.to ?? parsed.to;
  const intervalRaw = Number(s?.quranIntervalMin);
  const intervalMin =
    draft.intervalMin ?? (Number.isFinite(intervalRaw) && intervalRaw >= 10 ? Math.min(intervalRaw, 360) : 60);

  const fromOk = /^[1-9]\d{0,2}$/.test(from) && Number(from) >= 1 && Number(from) <= 114;
  const toOk = /^[1-9]\d{0,2}$/.test(to) && Number(to) >= 1 && Number(to) <= 114;
  const rangeOk = fromOk && toOk && Number(from) <= Number(to);

  const save = useBotMutation<{ ok: true }>();
  const [ayah, setAyah] = useState<AyahPreview | null>(null);
  const preview = useBotMutation<{ ok: true; ayah?: AyahPreview }>();

  const saveSettings = async (): Promise<void> => {
    if (!rangeOk) return;
    const r = await save.run(() =>
      api.put('/api/bot/settings', {
        reciter: reciterId,
        surahRange: `${from}-${to}`,
        quranIntervalMin: intervalMin,
      }),
    );
    if (r.ok) {
      toast({ title: 'حُفظت إعدادات القرآن', description: 'سيعتمدها البوت في البثّ القادم' });
      settingsRes.refresh();
    } else {
      toast({ title: 'تعذّر الحفظ', description: r.error, variant: 'destructive' });
    }
  };

  const fetchPreview = async (): Promise<void> => {
    const r = await preview.run(() => api.post<{ ayah?: AyahPreview }>('/api/bot/quran/send-now', {}));
    if (r.ok) {
      setAyah(r.ayah ?? null);
      toast({ title: 'أُرسلت للجميع', description: 'وصلت الآية إلى المشتركين في البثّ الفعلي' });
    } else {
      toast({ title: 'تعذّر جلب الآية', description: r.error, variant: 'destructive' });
    }
  };

  const sendNow = async (): Promise<void> => {
    const r = await preview.run(() => api.post<{ ayah?: AyahPreview }>('/api/bot/quran/send-now', {}));
    if (r.ok) {
      toast({
        title: 'أُرسلت الآية إلى المشتركين',
        description: r.ayah ? `سورة ${r.ayah.surahName} — الآية ${arNum(r.ayah.ayah)}` : undefined,
      });
      if (r.ayah) setAyah(r.ayah);
    } else {
      toast({ title: 'تعذّر الإرسال', description: r.error, variant: 'destructive' });
    }
  };

  const showSkeleton = settingsRes.loading && !settingsRes.data;
  const showError = settingsRes.error !== null && !settingsRes.data;

  return (
    <div className="space-y-6">
      <header className="space-y-1.5">
        <h1 className="text-2xl font-bold leading-tight sm:text-3xl" style={{ fontFamily: DISPLAY, color: INK }}>
          القرآن الكريم
        </h1>
        <p className="text-sm" style={{ color: INK2 }}>
          إعدادات بثّ التلاوة بصوت الشيخ رعد الكردي مع نصّ الآية.
        </p>
        <Separator className="mt-3" />
      </header>

      {showError ? (
        <Card style={{ borderColor: DANGER }}>
          <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
            <p className="font-medium" style={{ color: DANGER }}>تعذّر تحميل إعدادات القرآن</p>
            <p className="text-sm" style={{ color: INK2 }}>{settingsRes.error}</p>
            <Button variant="outline" size="sm" onClick={settingsRes.refresh}>
              <RefreshCw aria-hidden /> إعادة المحاولة
            </Button>
          </CardContent>
        </Card>
      ) : showSkeleton ? (
        <div className="space-y-3">
          <Skeleton className="h-72 w-full" />
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg" style={{ fontFamily: DISPLAY, color: INK }}>
              <AudioLines className="size-5" style={{ color: PRIMARY_DEEP }} aria-hidden />
              بث الآيات الصوتية
            </CardTitle>
            <CardDescription>
              إرسال دوري لتلاوة بصوت الشيخ رعد الكردي كرسالة صوتية، مرفقة بنص الآية بتنسيق أنيق.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Reciter — one active option, alternates disabled per requirements */}
            <div className="space-y-2">
              <label htmlFor="quran-reciter" className="text-sm" style={{ color: INK2 }}>المقرئ</label>
              <Select value={reciterId}>
                <SelectTrigger id="quran-reciter" className="h-11 w-full sm:h-9 sm:w-72" aria-label="اختيار المقرئ">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={reciterId}>الشيخ رعد الكردي</SelectItem>
                  <SelectItem value="alt-yasser" disabled title="يُستخدم البديل تلقائيًا عند تعذّر المصدر الأساسي">
                    الشيخ ياسر الدوسري (بديل)
                  </SelectItem>
                  <SelectItem value="alt-mishary" disabled title="يُستخدم البديل تلقائيًا عند تعذّر المصدر الأساسي">
                    الشيخ مشاري العفاسي (بديل)
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs" style={{ color: INK3 }}>
                الخيارات البديلة احتياطية — يستعملها البوت تلقائيًا عند تعذّر المصدر الأساسي.
              </p>
            </div>

            {s !== null ? (
              <>
                {/* Surah range */}
                <div className="space-y-2">
                  <span className="text-sm" style={{ color: INK2 }}>نطاق السور</span>
                  <div className="flex items-center gap-2">
                    <Input
                      dir="ltr"
                      inputMode="numeric"
                      className="w-24 text-center font-mono"
                      style={{ fontFamily: MONO }}
                      placeholder="من ١"
                      value={from}
                      onChange={(e) => setDraft((d) => ({ ...d, from: toLatinDigits(e.target.value).replace(/\D/g, '') }))}
                      aria-label="السورة الأولى"
                      aria-invalid={from !== '' && !fromOk}
                    />
                    <span style={{ color: INK3 }} aria-hidden>—</span>
                    <Input
                      dir="ltr"
                      inputMode="numeric"
                      className="w-24 text-center font-mono"
                      style={{ fontFamily: MONO }}
                      placeholder="إلى ١١٤"
                      value={to}
                      onChange={(e) => setDraft((d) => ({ ...d, to: toLatinDigits(e.target.value).replace(/\D/g, '') }))}
                      aria-label="السورة الأخيرة"
                      aria-invalid={to !== '' && !toOk}
                    />
                  </div>
                  <p className="text-xs" style={{ color: from !== '' || to !== '' ? (rangeOk ? INK3 : DANGER) : INK3 }}>
                    {rangeOk
                      ? `من السورة ${arNum(Number(from))} إلى السورة ${arNum(Number(to))}`
                      : 'أدخل رقمي سورتين صحيحين بين ١ و١١٤، والأولى أصغر من الثانية'}
                  </p>
                </div>

                {/* Interval */}
                <div className="space-y-3">
                  <div className="flex items-baseline justify-between">
                    <label htmlFor="quran-interval" className="text-sm" style={{ color: INK2 }}>الفاصل بين الآيات</label>
                    <span className="font-medium tabular-nums" style={{ color: PRIMARY_DEEP }}>
                      كل {arNum(intervalMin)} دقيقة
                    </span>
                  </div>
                  <Slider
                    id="quran-interval"
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
                </div>
              </>
            ) : (
              <Skeleton className="h-36 w-full" />
            )}

            <div className="flex flex-wrap gap-3 pt-2">
              <Button
                onClick={() => void saveSettings()}
                disabled={save.busy || !rangeOk}
                className="h-11 sm:h-9"
              >
                {save.busy ? <Loader2 className="animate-spin" aria-hidden /> : null}
                حفظ الإعدادات
              </Button>
              <Button
                variant="outline"
                onClick={() => void fetchPreview()}
                disabled={preview.busy}
                className="h-11 sm:h-9"
              >
                {preview.busy ? <Loader2 className="animate-spin" aria-hidden /> : <Eye aria-hidden />}
                جلب آية للمعاينة
              </Button>
              <Button
                variant="secondary"
                onClick={() => void sendNow()}
                disabled={preview.busy}
                className="h-11 sm:h-9"
              >
                <Send aria-hidden /> إرسال آية الآن للمشتركين
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ayah preview — decorative double gold frame, Amiri display type */}
      {ayah !== null && (
        <figure
          className="p-1.5"
          style={{ border: `1px solid ${ACCENT}`, borderRadius: 'var(--radius-lg)' }}
          aria-label="آية للمعاينة"
        >
          <div
            className="px-4 py-8 text-center sm:px-10 sm:py-10"
            style={{ border: `1px solid ${ACCENT}`, borderRadius: 'calc(var(--radius-lg) - 3px)' }}
          >
            <p
              dir="rtl"
              lang="ar"
              className="text-2xl leading-[2.2] sm:text-3xl sm:leading-[2.2]"
              style={{ fontFamily: DISPLAY, color: INK }}
            >
              {ayah.text}
            </p>
            <Separator className="mx-auto my-6 max-w-xs" style={{ backgroundColor: ACCENT }} />
            <p className="text-sm" style={{ color: ACCENT_DEEP }}>
              سورة {ayah.surahName} — الآية {arNum(ayah.ayah)}
            </p>
            {ayah.audioSent && (
              <Badge className="mt-3 gap-1.5" style={{ backgroundColor: SUCCESS_SOFT, color: PRIMARY_DEEP, borderColor: 'transparent' }}>
                <Volume2 className="size-3" aria-hidden /> أُرفقت التلاوة الصوتية
              </Badge>
            )}
            <div className="mt-6 flex items-center justify-center gap-1.5" aria-hidden>
              <BookOpen className="size-3.5" style={{ color: ACCENT }} />
              <span className="text-xs" style={{ color: INK3 }}>معاينة الآية كما تُبثّ للمشتركين</span>
            </div>
          </div>
        </figure>
      )}
    </div>
  );
}
