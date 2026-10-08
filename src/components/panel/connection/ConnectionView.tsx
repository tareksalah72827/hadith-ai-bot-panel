'use client';

/**
 * Connection view: live QR pairing (canvas painted with the `qrcode` lib),
 * phone-number pairing code with copy button, and session restart/disconnect
 * with confirmation. Polls /api/bot/connect/qr (3s) and /api/bot/status (5s).
 */
import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  Check,
  CircleCheck,
  Copy,
  Loader2,
  Phone,
  QrCode,
  RefreshCw,
  RotateCcw,
  Unplug,
} from 'lucide-react';
import { formatUptime, useBotMutation, useBotResource } from '@/components/panel/shared/hooks';
import { api } from '@/lib/browser-api';
import type { BotStatus, PairResponse, QrResponse } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type SessionResponse = { message?: string };

const FOCUS_CLASS =
  'focus-visible:border-[var(--color-focus)] focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]';

function qrStateLabel(state: QrResponse['state']): string {
  switch (state) {
    case 'waiting':
      return 'بانتظار الربط';
    case 'connecting':
      return 'جارٍ الاتصال';
    case 'connected':
      return 'متصل';
    default:
      return 'غير متصل';
  }
}

export default function ConnectionView() {
  const { toast } = useToast();
  const status = useBotResource<BotStatus>('/api/bot/status', 5000);
  const qrRes = useBotResource<QrResponse>('/api/bot/connect/qr', 3000);
  const pairM = useBotMutation<PairResponse>();
  const startM = useBotMutation<SessionResponse>();
  const logoutM = useBotMutation<SessionResponse>();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [phone, setPhone] = useState('');
  const [copied, setCopied] = useState(false);

  const connected = status.data?.connected === true || qrRes.data?.state === 'connected';
  const connecting = status.data?.connecting === true || qrRes.data?.state === 'connecting';
  const number = status.data?.me?.number ?? null;
  const qr = qrRes.data?.qr ?? null;
  const pairingCode = pairM.result?.pairingCode ?? null;

  // Paint the freshest QR string onto the canvas.
  useEffect(() => {
    if (connected || !qr) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    QRCode.toCanvas(canvas, qr, { width: 232, margin: 1 }).catch(() => {
      /* render failure is non-fatal — the next poll retries */
    });
  }, [qr, connected]);

  const sessionMessage = connected
    ? `الجلسة متصلة حاليًا${number ? ` بـ ${number}` : ''}${
        typeof status.data?.uptimeSec === 'number' ? ` — مدة التشغيل ${formatUptime(status.data.uptimeSec)}` : ''
      }`
    : connecting
      ? 'جارٍ إنشاء الجلسة… انتظر ظهور رمز QR.'
      : 'لا توجد جلسة نشطة — ابدأ الربط بإحدى الطريقتين أعلاه.';

  async function handlePair(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = phone.trim();
    if (value.length < 7 || pairM.busy) return;
    setCopied(false);
    const r = await pairM.run(() => api.post<PairResponse>('/api/bot/connect/pair', { phone: value }));
    if (r.ok) {
      if (r.pairingCode) {
        toast({ title: 'تم توليد كود الاقتران', description: 'أدخله في واتساب خلال دقيقة واحدة.' });
      } else {
        toast({
          title: 'لم يُولَّد كود',
          description: r.message ?? 'تحقق من صحة الرقم ثم أعد المحاولة.',
          variant: 'destructive',
        });
      }
    } else {
      toast({ title: 'تعذّر طلب الكود', description: r.error, variant: 'destructive' });
    }
  }

  async function copyCode() {
    if (!pairingCode) return;
    try {
      await navigator.clipboard.writeText(pairingCode);
      setCopied(true);
      toast({ title: 'تم نسخ الكود' });
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'تعذّر النسخ', description: 'انسخ الكود يدويًا من الشاشة.', variant: 'destructive' });
    }
  }

  async function handleRestart() {
    const r = await startM.run(() => api.post<SessionResponse>('/api/bot/connect/start', { mode: 'qr' }));
    if (r.ok) {
      toast({ title: 'بدأت إعادة التهيئة', description: 'سيظهر رمز QR جديد خلال لحظات.' });
      qrRes.refresh();
      status.refresh();
    } else {
      toast({ title: 'تعذّر بدء الجلسة', description: r.error, variant: 'destructive' });
    }
  }

  async function handleLogout() {
    const r = await logoutM.run(() => api.post<SessionResponse>('/api/bot/connect/logout'));
    if (r.ok) {
      toast({ title: 'تم فصل الجلسة', description: 'يمكنك إعادة الربط في أي وقت.' });
      pairM.reset();
      qrRes.refresh();
      status.refresh();
    } else {
      toast({ title: 'تعذّر فصل الجلسة', description: r.error, variant: 'destructive' });
    }
  }

  return (
    <div dir="rtl" className="flex min-w-0 flex-col gap-4 md:gap-6">
      {/* View intro */}
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0">
          <h2
            className="text-xl font-bold leading-relaxed text-[var(--color-ink)] md:text-2xl"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            ربط البوت بواتساب
          </h2>
          <p className="mt-1 text-sm text-[var(--color-ink-3)]">
            اختر طريقة الربط: رمز QR من الجهاز، أو كود اقتران برقم الهاتف
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            qrRes.refresh();
            status.refresh();
          }}
          className="border-[var(--color-line)]"
          aria-label="تحديث حالة الاتصال"
        >
          <RefreshCw className="size-3.5" aria-hidden="true" />
          تحديث
        </Button>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* QR pairing */}
        <Card className="gap-0 rounded-[var(--radius-md)] border-[var(--color-line)] bg-[var(--color-paper-2)] py-4 shadow-none">
          <CardHeader className="gap-0 px-4 pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-[var(--color-ink)]">
              <QrCode className="size-5" style={{ color: 'var(--color-primary)' }} aria-hidden="true" />
              الربط عبر رمز QR
            </CardTitle>
            <CardDescription className="ps-7 text-xs text-[var(--color-ink-3)]">
              امسح الرمز من تطبيق واتساب على هاتفك
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 px-4">
            {connected ? (
              <div
                className="flex flex-col items-center gap-2 rounded-[var(--radius-md)] border border-dashed p-6 text-center"
                style={{
                  borderColor: 'var(--color-success)',
                  backgroundColor: 'color-mix(in oklab, var(--color-success) 8%, transparent)',
                }}
              >
                <CircleCheck className="size-9" style={{ color: 'var(--color-success)' }} aria-hidden="true" />
                <p className="text-sm font-medium text-[var(--color-ink)]">
                  متصل{number ? (
                    <>
                      {' '}بـ{' '}
                      <span dir="ltr" style={{ fontFamily: 'var(--font-mono)' }}>
                        {number}
                      </span>
                    </>
                  ) : null}
                </p>
                <p className="text-xs text-[var(--color-ink-3)]">
                  مدة التشغيل: {formatUptime(status.data?.uptimeSec ?? Number.NaN)}
                </p>
              </div>
            ) : (
              <>
                <div
                  className="flex justify-center rounded-[var(--radius-md)] border p-3"
                  style={{ borderColor: 'var(--color-line)', backgroundColor: 'var(--color-paper)' }}
                >
                  {qr ? (
                    <canvas
                      ref={canvasRef}
                      width={240}
                      height={240}
                      role="img"
                      aria-label="رمز ربط واتساب"
                      className="h-auto max-w-full"
                      style={{ width: 240 }}
                    />
                  ) : (
                    <div
                      className="flex aspect-square w-full max-w-[240px] flex-col items-center justify-center gap-2 text-center"
                      aria-live="polite"
                    >
                      <Loader2 className="size-7 animate-spin text-[var(--color-ink-3)]" aria-hidden="true" />
                      <p className="text-xs leading-relaxed text-[var(--color-ink-3)]">
                        {qrRes.error ? 'تعذّر جلب الرمز — تحقق من الاتصال' : 'بانتظار رمز الاستجابة السريعة…'}
                      </p>
                    </div>
                  )}
                </div>
                <ol className="flex flex-col gap-1.5 text-sm text-[var(--color-ink-2)]">
                  <li className="flex gap-2">
                    <span className="font-semibold" style={{ color: 'var(--color-primary)' }}>١.</span>
                    افتح واتساب على هاتفك
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold" style={{ color: 'var(--color-primary)' }}>٢.</span>
                    افتح «الإعدادات»
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold" style={{ color: 'var(--color-primary)' }}>٣.</span>
                    اختر «الأجهزة المرتبطة»
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold" style={{ color: 'var(--color-primary)' }}>٤.</span>
                    اضغط «ربط جهاز» ثم امسح الرمز
                  </li>
                </ol>
                {qrRes.data && !qr && (
                  <p className="text-xs text-[var(--color-ink-3)]">
                    حالة الجلسة: {qrStateLabel(qrRes.data.state)}
                  </p>
                )}
                {qrRes.error && (
                  <p role="alert" className="text-xs leading-relaxed text-[var(--color-danger)]">
                    {qrRes.error}
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Phone pairing */}
        <Card className="gap-0 rounded-[var(--radius-md)] border-[var(--color-line)] bg-[var(--color-paper-2)] py-4 shadow-none">
          <CardHeader className="gap-0 px-4 pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-[var(--color-ink)]">
              <Phone className="size-5" style={{ color: 'var(--color-primary)' }} aria-hidden="true" />
              الربط برقم الهاتف
            </CardTitle>
            <CardDescription className="ps-7 text-xs text-[var(--color-ink-3)]">
              اطلب كودًا من 8 خانات تدخله في واتساب
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 px-4">
            <form onSubmit={handlePair} noValidate className="flex flex-col gap-2">
              <Label htmlFor="pair-phone" className="text-[var(--color-ink-2)]">
                رقم الهاتف
              </Label>
              <Input
                id="pair-phone"
                name="phone"
                type="tel"
                inputMode="tel"
                dir="ltr"
                autoComplete="tel"
                placeholder="+20 10 1234 5678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={pairM.busy}
                className={`h-11 bg-[var(--color-paper)] text-left text-[var(--color-ink)] ${FOCUS_CLASS}`}
              />
              <p className="text-xs leading-relaxed text-[var(--color-ink-3)]">
                أدخل رقمك بصيغته الدولية — يُقبل بأي صيغة (مع أو بدون + أو 00)
              </p>
              <Button
                type="submit"
                disabled={pairM.busy || phone.trim().length < 7}
                className="mt-1 h-11 bg-[var(--color-primary)] text-[var(--color-paper)] hover:bg-[var(--color-primary-deep)]"
              >
                {pairM.busy ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    جارٍ طلب الكود…
                  </>
                ) : (
                  'طلب كود الاقتران'
                )}
              </Button>
            </form>

            {pairM.error && (
              <p
                role="alert"
                className="rounded-[var(--radius-sm)] px-3 py-2 text-sm leading-relaxed"
                style={{
                  backgroundColor: 'color-mix(in oklab, var(--color-danger) 10%, transparent)',
                  color: 'var(--color-danger)',
                }}
              >
                {pairM.error}
              </p>
            )}

            {pairingCode && (
              <div
                className="flex flex-col items-center gap-3 rounded-[var(--radius-md)] border p-4"
                style={{ borderColor: 'var(--color-line)', backgroundColor: 'var(--color-paper)' }}
              >
                <p className="text-center text-xs leading-relaxed text-[var(--color-ink-3)]">
                  أدخل هذا الكود في واتساب ← «الأجهزة المرتبطة» ← «ربط برقم الهاتف»
                </p>
                <div className="flex items-center gap-3">
                  <code
                    dir="ltr"
                    className="text-2xl font-semibold md:text-3xl"
                    style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-primary)', letterSpacing: '0.35em' }}
                  >
                    {pairingCode}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copyCode}
                    aria-label="نسخ كود الاقتران"
                    className="border-[var(--color-line)]"
                  >
                    {copied ? (
                      <Check className="size-4" style={{ color: 'var(--color-success)' }} aria-hidden="true" />
                    ) : (
                      <Copy className="size-4" aria-hidden="true" />
                    )}
                  </Button>
                </div>
              </div>
            )}

            {pairM.result && !pairingCode && pairM.result.message && (
              <p className="text-sm leading-relaxed text-[var(--color-ink-2)]">{pairM.result.message}</p>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Session management */}
      <Card className="gap-0 rounded-[var(--radius-md)] border-[var(--color-line)] bg-[var(--color-paper-2)] py-4 shadow-none">
        <CardHeader className="gap-0 px-4 pb-3">
          <CardTitle className="text-base text-[var(--color-ink)]">إدارة الجلسة</CardTitle>
          <CardDescription className="text-xs text-[var(--color-ink-3)]">
            إعادة التهيئة برمز QR، أو فصل البوت عن واتساب
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 px-4">
          <p
            className="flex items-center gap-2 rounded-[var(--radius-md)] border px-4 py-2.5 text-sm leading-relaxed"
            style={{ borderColor: 'var(--color-line)', backgroundColor: 'var(--color-paper)' }}
          >
            <span
              className={cn(
                'size-2 shrink-0 rounded-full',
                (connected || connecting) && 'hadith-pulse-dot',
              )}
              style={{
                backgroundColor: connected
                  ? 'var(--color-success)'
                  : connecting
                    ? 'var(--color-warn)'
                    : 'var(--color-ink-3)',
              }}
              aria-hidden="true"
            />
            <span className="min-w-0">{sessionMessage}</span>
          </p>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={handleRestart}
              disabled={startM.busy}
              className="h-11 border-[var(--color-line)]"
            >
              {startM.busy ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <RotateCcw className="size-4" aria-hidden="true" />
              )}
              {startM.busy ? 'جارٍ التهيئة…' : 'إعادة تهيئة الجلسة'}
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  disabled={logoutM.busy}
                  className="h-11 border-[var(--color-danger)] text-[var(--color-danger)] hover:bg-[var(--color-paper-3)]"
                >
                  {logoutM.busy ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Unplug className="size-4" aria-hidden="true" />
                  )}
                  فصل الجلسة
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent
                dir="rtl"
                className="rounded-[var(--radius-md)] border-[var(--color-line)] bg-[var(--color-paper-2)]"
              >
                <AlertDialogHeader>
                  <AlertDialogTitle
                    className="text-lg text-[var(--color-ink)]"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    تأكيد فصل الجلسة
                  </AlertDialogTitle>
                  <AlertDialogDescription className="leading-relaxed text-[var(--color-ink-2)]">
                    سيتم فصل Hadith Ai.BOT عن واتساب وإيقاف جميع عمليات الإرسال حتى إعادة الربط. هل تريد المتابعة؟
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="border-[var(--color-line)]">إلغاء</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleLogout}
                    className="bg-[var(--color-danger)] text-[var(--color-paper)] hover:opacity-90"
                  >
                    نعم، فصل الجلسة
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {(startM.error || logoutM.error) && (
            <p role="alert" className="text-sm leading-relaxed text-[var(--color-danger)]">
              {startM.error ?? logoutM.error}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
