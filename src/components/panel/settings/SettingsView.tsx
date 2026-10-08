'use client';

/**
 * SettingsView — identity, greeting, official links (read-only),
 * technical placeholders, and a guarded WhatsApp session restart.
 */
import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  Building2, ExternalLink, Info, Instagram, KeyRound, Loader2, MoonStar, Music2,
  Podcast, RefreshCw, RotateCcw, ShieldAlert, Twitter, User, Youtube, type LucideIcon,
} from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useBotMutation, useBotResource } from '@/components/panel/shared/hooks';
import { api } from '@/lib/browser-api';
import type { BotSettings } from '@/lib/types';

// ---- Theme tokens (var-only, with shadcn fallbacks) ----
const INK = 'var(--color-ink, var(--foreground))';
const INK2 = 'var(--color-ink-2, var(--muted-foreground))';
const INK3 = 'var(--color-ink-3, var(--muted-foreground))';
const PAPER2 = 'var(--color-paper-2, var(--muted))';
const LINE = 'var(--color-line, var(--border))';
const PRIMARY_DEEP = 'var(--color-primary-deep, var(--primary))';
const DANGER = 'var(--color-danger, var(--destructive))';
const MONO = "var(--font-mono, 'IBM Plex Mono', monospace)";
const DISPLAY = "var(--font-display, 'Amiri', serif)";

/** Official organization links (spec §1) — read-only, open in a new tab. */
const OFFICIAL_LINKS: Array<{ label: string; url: string; display: string; icon: LucideIcon }> = [
  { label: 'قناة اليوتيوب', url: 'https://youtube.com/@hadith_1', display: 'youtube.com/@hadith_1', icon: Youtube },
  { label: 'إنستغرام', url: 'https://www.instagram.com/islamic_hadith4', display: 'instagram.com/islamic_hadith4', icon: Instagram },
  { label: 'منصة X', url: 'https://x.com/islamic4_hadith', display: 'x.com/islamic4_hadith', icon: Twitter },
  { label: 'Apple Podcast', url: 'https://podcasts.apple.com/eg/podcast/hadith4/id1851589405', display: 'podcasts.apple.com — Hadith4', icon: Podcast },
  { label: 'Spotify', url: 'https://open.spotify.com/show/61NeWyDgh1IUmrllNlsoLW', display: 'open.spotify.com — Hadith4', icon: Music2 },
  { label: 'سِراجًا منيرًا', url: 'https://siraj-munira.vercel.app', display: 'siraj-munira.vercel.app', icon: MoonStar },
];

interface IdentityForm {
  botName: string;
  orgName: string;
  founder: string;
  company: string;
  modelName: string;
  greeting: string;
}

const MASK = '••••••••';

export default function SettingsView(): ReactNode {
  const { toast } = useToast();
  const res = useBotResource<{ settings: BotSettings }>('/api/bot/settings', 60000);

  // Draft overrides server values while editing; derived during render (no seed effect)
  const [draft, setDraft] = useState<Partial<IdentityForm>>({});
  const s = res.data?.settings ?? null;
  const vals: IdentityForm = {
    botName: draft.botName ?? s?.botName ?? '',
    orgName: draft.orgName ?? s?.orgName ?? '',
    founder: draft.founder ?? s?.founder ?? '',
    company: draft.company ?? s?.company ?? '',
    modelName: draft.modelName ?? s?.modelName ?? '',
    greeting: draft.greeting ?? s?.greeting ?? '',
  };

  const saveIdentity = useBotMutation<{ ok: true }>();
  const saveGreeting = useBotMutation<{ ok: true }>();
  const restart = useBotMutation<{ ok: true; message?: string }>();

  const persistIdentity = async (): Promise<void> => {
    if (s === null) return;
    const r = await saveIdentity.run(() =>
      api.put('/api/bot/settings', {
        botName: vals.botName.trim(),
        orgName: vals.orgName.trim(),
        founder: vals.founder.trim(),
        company: vals.company.trim(),
        modelName: vals.modelName.trim(),
      }),
    );
    if (r.ok) {
      toast({ title: 'حُفظت هوية البوت', description: 'ظهرت التعديلات في رسائل الترحيب والتوقيع' });
      res.refresh();
    } else {
      toast({ title: 'تعذّر الحفظ', description: r.error, variant: 'destructive' });
    }
  };

  const persistGreeting = async (): Promise<void> => {
    if (s === null) return;
    const r = await saveGreeting.run(() => api.put('/api/bot/settings', { greeting: vals.greeting }));
    if (r.ok) {
      toast({ title: 'حُفظ نص الترحيب', description: 'يستقبل به البوت كل مشترك جديد' });
      res.refresh();
    } else {
      toast({ title: 'تعذّر الحفظ', description: r.error, variant: 'destructive' });
    }
  };

  const restartSession = async (): Promise<void> => {
    const r = await restart.run(() => api.post('/api/bot/connect/start', { mode: 'qr' }));
    if (r.ok) {
      toast({
        title: 'بدأت جلسة واتساب جديدة',
        description: r.message ?? 'انتقل إلى صفحة «الاتصال» لمسح رمز QR خلال دقيقة',
      });
    } else {
      toast({ title: 'تعذّر بدء الجلسة', description: r.error, variant: 'destructive' });
    }
  };

  const showSkeleton = res.loading && !res.data;
  const showError = res.error !== null && !res.data;

  const field = (
    id: keyof Omit<IdentityForm, 'greeting'>,
    label: string,
    icon: LucideIcon,
    placeholder: string,
  ): ReactNode => {
    const Icon = icon;
    return (
      <div className="space-y-2">
        <label htmlFor={`set-${id}`} className="flex items-center gap-1.5 text-sm" style={{ color: INK2 }}>
          <Icon className="size-4" aria-hidden /> {label}
        </label>
        <Input
          id={`set-${id}`}
          dir="rtl"
          value={vals[id]}
          onChange={(e) => setDraft((d) => ({ ...d, [id]: e.target.value }))}
          placeholder={placeholder}
          aria-label={label}
        />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1.5">
        <h1 className="text-2xl font-bold leading-tight sm:text-3xl" style={{ fontFamily: DISPLAY, color: INK }}>
          الإعدادات
        </h1>
        <p className="text-sm" style={{ color: INK2 }}>
          هوية البوت والروابط الرسمية والتهيئة التقنية.
        </p>
        <Separator className="mt-3" />
      </header>

      {showError ? (
        <Card style={{ borderColor: DANGER }}>
          <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
            <p className="font-medium" style={{ color: DANGER }}>تعذّر تحميل الإعدادات</p>
            <p className="text-sm" style={{ color: INK2 }}>{res.error}</p>
            <Button variant="outline" size="sm" onClick={res.refresh}>
              <RefreshCw aria-hidden /> إعادة المحاولة
            </Button>
          </CardContent>
        </Card>
      ) : showSkeleton ? (
        <div className="space-y-3">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
          <div className="space-y-4">
            {/* Identity */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg" style={{ fontFamily: DISPLAY, color: INK }}>الهوية</CardTitle>
                <CardDescription>تظهر هذه البيانات في توقيع البوت ورسائله.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  {field('botName', 'اسم البوت', User, 'Hadith Ai.BOT')}
                  {field('orgName', 'الجهة', Building2, 'منظمة حديث الإسلامية')}
                  {field('founder', 'المؤسس', User, 'الدكتور طارق الفارس')}
                  {field('company', 'الشركة المطوّرة', Building2, 'UNIRAL')}
                  {field('modelName', 'اسم النموذج الظاهر', Info, 'Hadith Ai-1.5 Flash Pro')}
                </div>
                <div className="flex justify-end">
                  <Button
                    onClick={() => void persistIdentity()}
                    disabled={saveIdentity.busy || s === null}
                    className="h-11 sm:h-9"
                  >
                    {saveIdentity.busy ? <Loader2 className="animate-spin" aria-hidden /> : null}
                    حفظ الهوية
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Greeting */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base" style={{ color: INK }}>الترحيب</CardTitle>
                <CardDescription>رسالة الترحيب التي يستقبل بها البوت كل مشترك جديد.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  dir="rtl"
                  rows={5}
                  value={vals.greeting}
                  onChange={(e) => setDraft((d) => ({ ...d, greeting: e.target.value }))}
                  placeholder="اكتب رسالة الترحيب…"
                  aria-label="نص الترحيب"
                />
                <div className="flex justify-end">
                  <Button
                    onClick={() => void persistGreeting()}
                    disabled={saveGreeting.busy || !vals.greeting.trim()}
                    className="h-11 sm:h-9"
                  >
                    {saveGreeting.busy ? <Loader2 className="animate-spin" aria-hidden /> : null}
                    حفظ الترحيب
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            {/* Official links — read-only */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base" style={{ color: INK }}>الروابط الرسمية</CardTitle>
                <CardDescription>منصات منظمة حديث الإسلامية — للقراءة فقط.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1" aria-label="الروابط الرسمية">
                  {OFFICIAL_LINKS.map((link) => (
                    <li
                      key={link.url}
                      className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-accent/40"
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        <link.icon className="size-4 shrink-0" style={{ color: PRIMARY_DEEP }} aria-hidden />
                        <span className="min-w-0">
                          <span className="block text-sm font-medium" style={{ color: INK }}>{link.label}</span>
                          <span dir="ltr" className="block truncate text-start font-mono text-xs" style={{ fontFamily: MONO, color: INK3 }}>
                            {link.display}
                          </span>
                        </span>
                      </span>
                      <Button asChild variant="outline" size="icon" className="size-11 shrink-0 sm:size-9" title={`فتح ${link.label}`}>
                        <a href={link.url} target="_blank" rel="noopener noreferrer" aria-label={`فتح ${link.label} في تبويب جديد`}>
                          <ExternalLink aria-hidden />
                        </a>
                      </Button>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Technical configuration — masked placeholders, read-only */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base" style={{ color: INK }}>التهيئة التقنية</CardTitle>
                <CardDescription>بيانات الربط بين اللوحة وسيرفر البوت.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <span className="flex items-center gap-1.5 text-sm" style={{ color: INK2 }}>
                    <KeyRound className="size-4" aria-hidden /> BOT_API_URL
                  </span>
                  <div
                    dir="rtl"
                    className="rounded-md border px-3 py-2 text-sm"
                    style={{ backgroundColor: PAPER2, borderColor: LINE, color: INK2 }}
                    aria-label="رابط واجهة البوت، مقنّع"
                  >
                    {MASK} (تُضبط في متغيرات بيئة اللوحة)
                  </div>
                </div>
                <div className="space-y-1.5">
                  <span className="flex items-center gap-1.5 text-sm" style={{ color: INK2 }}>
                    <KeyRound className="size-4" aria-hidden /> BOT_API_KEY
                  </span>
                  <div
                    dir="rtl"
                    className="rounded-md border px-3 py-2 text-sm"
                    style={{ backgroundColor: PAPER2, borderColor: LINE, color: INK2 }}
                    aria-label="مفتاح واجهة البوت، مقنّع"
                  >
                    {MASK} (تُضبط في متغيرات بيئة اللوحة)
                  </div>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: INK3 }}>
                  لا يُرجع البوت هذه القيم إلى اللوحة حفاظًا على الأمان — أعد تعيينها في
                  Vercel ← Environment Variables.
                </p>
              </CardContent>
            </Card>

            {/* Danger zone */}
            <Card style={{ borderColor: 'color-mix(in oklab, var(--color-danger, var(--destructive)) 35%, var(--color-line, var(--border)))' }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base" style={{ color: DANGER }}>
                  <ShieldAlert className="size-4" aria-hidden /> منطقة الخطر
                </CardTitle>
                <CardDescription>إجراءات لا يمكن التراجع عنها — تعمل على الجلسة الفعلية للبوت.</CardDescription>
              </CardHeader>
              <CardContent>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      disabled={restart.busy}
                      className="h-11 gap-2 border-[1.5px] sm:h-9"
                      style={{ borderColor: DANGER, color: DANGER }}
                    >
                      {restart.busy ? <Loader2 className="animate-spin" aria-hidden /> : <RotateCcw aria-hidden />}
                      إعادة تشغيل جلسة واتساب
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent dir="rtl">
                    <AlertDialogHeader>
                      <AlertDialogTitle style={{ fontFamily: DISPLAY }}>إعادة تشغيل جلسة واتساب</AlertDialogTitle>
                      <AlertDialogDescription>
                        سيفصل البوت جلسته الحالية ويبدأ جلسة جديدة برمز QR. سيتوقف البوت عن العمل
                        حتى يمسح المسؤول الرمز من صفحة «الاتصال». هل تريد المتابعة؟
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2">
                      <AlertDialogCancel disabled={restart.busy}>إلغاء</AlertDialogCancel>
                      <AlertDialogAction onClick={() => void restartSession()} disabled={restart.busy}>
                        {restart.busy ? <Loader2 className="animate-spin" aria-hidden /> : null}
                        إعادة التشغيل
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
