'use client';

/**
 * Login screen — a centered card over a calm paper background with a subtle
 * CSS-only geometric islamic pattern (gradients built from theme tokens, no
 * images). Calls api.login and hands control back through onAuthenticated.
 */
import { useState } from 'react';
import { Loader2, Moon } from 'lucide-react';
import { api } from '@/lib/browser-api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/** Token-based focus ring shared by the form controls. */
const FOCUS_CLASS =
  'focus-visible:border-[var(--color-focus)] focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]';

export default function LoginView({
  onAuthenticated,
}: {
  onAuthenticated: (username: string) => void;
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = username.trim();
    if (busy || !name || !password) return;
    setBusy(true);
    setError(null);
    const r = await api.login(name, password);
    setBusy(false);
    if (r.ok) {
      onAuthenticated(name); // success — the parent swaps to the app shell
    } else {
      setError(r.error || 'فشل تسجيل الدخول — تحقق من اسم المستخدم وكلمة المرور');
    }
  }

  return (
    <div
      dir="rtl"
      className="flex min-h-screen items-center justify-center p-4"
      style={{
        backgroundColor: 'var(--color-paper)',
        backgroundImage: [
          'radial-gradient(900px 480px at 50% -12%, color-mix(in oklab, var(--color-accent) 12%, transparent), transparent 70%)',
          'repeating-linear-gradient(45deg, color-mix(in oklab, var(--color-primary) 5%, transparent) 0 1px, transparent 1px 30px)',
          'repeating-linear-gradient(-45deg, color-mix(in oklab, var(--color-accent) 6%, transparent) 0 1px, transparent 1px 30px)',
        ].join(', '),
      }}
    >
      <Card className="w-full max-w-sm gap-6 rounded-[var(--radius-md)] border-[var(--color-line)] bg-[var(--color-paper-2)] py-8 shadow-none">
        <CardHeader className="items-center gap-3 px-6 text-center">
          <span
            className="flex size-14 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-paper-3)]"
            aria-hidden="true"
          >
            <Moon className="size-7" style={{ color: 'var(--color-accent)' }} />
          </span>
          <CardTitle
            className="text-2xl font-bold leading-relaxed text-[var(--color-ink)]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Hadith Ai.BOT
          </CardTitle>
          <CardDescription className="text-sm text-[var(--color-ink-3)]">
            منظمة حديث الإسلامية
          </CardDescription>
        </CardHeader>

        <CardContent className="px-6">
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="login-username" className="text-[var(--color-ink-2)]">
                اسم المسؤول
              </Label>
              <Input
                id="login-username"
                name="username"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={busy}
                className={`h-11 bg-[var(--color-paper)] text-[var(--color-ink)] ${FOCUS_CLASS}`}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="login-password" className="text-[var(--color-ink-2)]">
                كلمة المرور
              </Label>
              <Input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={busy}
                className={`h-11 bg-[var(--color-paper)] text-[var(--color-ink)] ${FOCUS_CLASS}`}
              />
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-[var(--radius-sm)] px-3 py-2 text-sm leading-relaxed"
                style={{
                  backgroundColor: 'color-mix(in oklab, var(--color-danger) 10%, transparent)',
                  color: 'var(--color-danger)',
                }}
              >
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={busy || !username.trim() || !password}
              className="h-11 w-full bg-[var(--color-primary)] text-[var(--color-paper)] hover:bg-[var(--color-primary-deep)]"
            >
              {busy ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  جارٍ الدخول…
                </>
              ) : (
                'تسجيل الدخول'
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs leading-relaxed text-[var(--color-ink-3)]">
            بيانات الدخول الافتراضية تُضبط عبر متغيرات البيئة{' '}
            <span dir="ltr" className="font-semibold" style={{ fontFamily: 'var(--font-mono)' }}>
              ADMIN_USERNAME
            </span>{' '}
            و{' '}
            <span dir="ltr" className="font-semibold" style={{ fontFamily: 'var(--font-mono)' }}>
              ADMIN_PASSWORD
            </span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
