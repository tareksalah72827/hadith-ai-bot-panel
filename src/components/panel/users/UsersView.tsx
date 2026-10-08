'use client';

/**
 * UsersView — bot users directory: search, subscription, block, direct message.
 * All data flows through the shared polling hooks (real bot data only).
 */
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Ban, Loader2, MessageCircle, MoreHorizontal, RefreshCw, Search, SearchX, UserCheck, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useBotMutation, useBotResource } from '@/components/panel/shared/hooks';
import { api } from '@/lib/browser-api';
import type { BotUser } from '@/lib/types';

// ---- Theme tokens (var-only, with shadcn fallbacks) ----
const INK = 'var(--color-ink, var(--foreground))';
const INK2 = 'var(--color-ink-2, var(--muted-foreground))';
const INK3 = 'var(--color-ink-3, var(--muted-foreground))';
const PRIMARY_DEEP = 'var(--color-primary-deep, var(--primary))';
const DANGER = 'var(--color-danger, var(--destructive))';
const SUCCESS_SOFT = 'color-mix(in oklab, var(--color-success, var(--color-primary)) 14%, var(--color-paper, var(--background)))';
const MONO = "var(--font-mono, 'IBM Plex Mono', monospace)";
const DISPLAY = "var(--font-display, 'Amiri', serif)";

const arNum = (n: number): string => n.toLocaleString('ar-EG');

/** "قبل ساعتين" style relative time in Arabic. */
function formatRelative(iso: string | null): string {
  if (!iso) return 'لم يظهر بعد';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '—';
  const diff = Math.round((then - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat('ar-EG', { numeric: 'auto' });
  const abs = Math.abs(diff);
  if (abs < 60) return rtf.format(diff, 'second');
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
  if (abs < 2592000) return rtf.format(Math.round(diff / 86400), 'day');
  return rtf.format(Math.round(diff / 2592000), 'month');
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

function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card style={{ borderColor: DANGER }}>
      <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
        <p className="font-medium" style={{ color: DANGER }}>تعذّر تحميل بيانات المستخدمين</p>
        <p className="text-sm" style={{ color: INK2 }}>{message}</p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw aria-hidden /> إعادة المحاولة
        </Button>
      </CardContent>
    </Card>
  );
}

function EmptyState({ searching }: { searching: boolean }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
        {searching ? (
          <SearchX className="size-10" style={{ color: INK3 }} aria-hidden />
        ) : (
          <Users className="size-10" style={{ color: INK3 }} aria-hidden />
        )}
        <p className="font-medium" style={{ color: INK }}>
          {searching ? 'لا نتائج مطابقة لبحثك' : 'لا يوجد مستخدمون بعد'}
        </p>
        <p className="max-w-sm text-sm" style={{ color: INK2 }}>
          {searching
            ? 'جرّب كلمة بحث أخرى — يبحث البوت في الأسماء وأرقام الهاتف.'
            : 'سيظهر هنا كل من راسل البوت على واتساب، مع إمكانية إدارة الاشتراك والمراسلة.'}
        </p>
      </CardContent>
    </Card>
  );
}

function StatusBadges({ user }: { user: BotUser }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {user.subscribed ? (
        <Badge style={{ backgroundColor: SUCCESS_SOFT, color: PRIMARY_DEEP, borderColor: 'transparent' }}>مشترك</Badge>
      ) : (
        <Badge variant="secondary">غير مشترك</Badge>
      )}
      {user.isBlocked && (
        <Badge variant="outline" style={{ color: DANGER, borderColor: DANGER }}>محظور</Badge>
      )}
    </div>
  );
}

export default function UsersView(): ReactNode {
  const { toast } = useToast();
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');

  // 300ms debounce before the resource path (and therefore the query) changes
  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(q), 300);
    return () => window.clearTimeout(t);
  }, [q]);

  const res = useBotResource<{ users: BotUser[] }>(
    `/api/bot/users?q=${encodeURIComponent(debouncedQ)}`,
    15000,
  );

  const users = res.data?.users ?? [];
  const total = users.length;
  const subscribed = users.filter((u) => u.subscribed).length;
  const blocked = users.filter((u) => u.isBlocked).length;

  // Direct-message dialog state
  const [msgTarget, setMsgTarget] = useState<BotUser | null>(null);
  const [msgText, setMsgText] = useState('');
  const send = useBotMutation<{ ok: true }>();
  const act = useBotMutation<{ ok: true }>();
  // Identifies which row is mid-action ("msg:12" / "block:12" / "sub:12")
  const [acting, setActing] = useState<string | null>(null);

  const openDialog = (user: BotUser): void => {
    setMsgTarget(user);
    setMsgText('');
  };

  const sendDirect = async (): Promise<void> => {
    if (!msgTarget || !msgText.trim()) return;
    setActing(`msg:${msgTarget.id}`);
    const r = await send.run(() => api.post(`/api/bot/users/${msgTarget.id}/message`, { text: msgText.trim() }));
    setActing(null);
    if (r.ok) {
      toast({ title: 'أُرسلت الرسالة', description: `وصلت إلى ${msgTarget.name || msgTarget.number}` });
      setMsgTarget(null);
      res.refresh();
    } else {
      toast({ title: 'تعذّر الإرسال', description: r.error, variant: 'destructive' });
    }
  };

  const toggleBlock = async (user: BotUser): Promise<void> => {
    setActing(`block:${user.id}`);
    const r = await act.run(() => api.post(`/api/bot/users/${user.id}/block`, { blocked: !user.isBlocked }));
    setActing(null);
    if (r.ok) {
      toast({
        title: user.isBlocked ? 'أُلغي الحظر' : 'تم حظر المستخدم',
        description: user.isBlocked ? 'سيستقبل الرسائل من جديد' : 'لن يستقبل البث ولن يرد عليه البوت',
      });
      res.refresh();
    } else {
      toast({ title: 'تعذّر تنفيذ الإجراء', description: r.error, variant: 'destructive' });
    }
  };

  const toggleSubscribe = async (user: BotUser): Promise<void> => {
    setActing(`sub:${user.id}`);
    const r = await act.run(() => api.post(`/api/bot/users/${user.id}/subscribe`, { subscribed: !user.subscribed }));
    setActing(null);
    if (r.ok) {
      toast({
        title: user.subscribed ? 'أُلغي الاشتراك' : 'فعُّل الاشتراك',
        description: user.subscribed ? 'لن يستقبل البث الدوري' : 'سيستقبل الآيات والاقتباسات والتذكيرات',
      });
      res.refresh();
    } else {
      toast({ title: 'تعذّر تنفيذ الإجراء', description: r.error, variant: 'destructive' });
    }
  };

  const actionMenu = (user: BotUser): ReactNode => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-11 sm:size-8"
          aria-label={`إجراءات ${user.name || user.number}`}
          disabled={acting !== null}
        >
          {acting === `block:${user.id}` ? (
            <Loader2 className="animate-spin" aria-hidden />
          ) : (
            <MoreHorizontal aria-hidden />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onSelect={() => openDialog(user)}>
          <MessageCircle aria-hidden /> إرسال رسالة مباشرة
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void toggleBlock(user)}>
          <Ban aria-hidden /> {user.isBlocked ? 'إلغاء الحظر' : 'حظر المستخدم'}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void toggleSubscribe(user)}>
          <UserCheck aria-hidden /> {user.subscribed ? 'إلغاء الاشتراك' : 'تفعيل الاشتراك'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const showSkeleton = res.loading && !res.data;
  const showError = res.error !== null && !res.data;

  return (
    <div className="space-y-6">
      <ViewHeader
        title="المستخدمون"
        description="كل من راسل البوت على واتساب — إدارة الاشتراك والحظر والمراسلة المباشرة."
      />

      {showError ? (
        <ErrorCard message={res.error ?? ''} onRetry={res.refresh} />
      ) : (
        <>
          {/* Counters derived from the loaded list only */}
          <section aria-label="ملخص المستخدمين" className="grid grid-cols-3 gap-3 sm:gap-4">
            {[
              { label: 'الإجمالي', value: total, danger: false },
              { label: 'المشتركون', value: subscribed, danger: false },
              { label: 'المحظورون', value: blocked, danger: true },
            ].map((c) => (
              <Card key={c.label} className="py-4">
                <CardContent className="px-4">
                  <p className="text-xs" style={{ color: INK2 }}>{c.label}</p>
                  <p
                    className="mt-1 text-2xl font-bold tabular-nums"
                    style={{ color: c.danger && c.value > 0 ? DANGER : INK }}
                  >
                    {arNum(c.value)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </section>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4" style={{ color: INK3 }} aria-hidden />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ابحث بالاسم أو رقم الهاتف…"
              className="ps-9"
              aria-label="البحث في المستخدمين"
              inputMode="search"
            />
            {showSkeleton && (
              <Loader2 className="absolute inset-y-0 end-3 my-auto size-4 animate-spin" style={{ color: INK3 }} aria-hidden />
            )}
          </div>

          {showSkeleton ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <EmptyState searching={debouncedQ.trim() !== ''} />
          ) : (
            <>
              {/* Desktop: table */}
              <ScrollArea className="hidden md:block" dir="rtl">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>المستخدم</TableHead>
                      <TableHead>الرقم</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead className="text-center">الرسائل</TableHead>
                      <TableHead>آخر ظهور</TableHead>
                      <TableHead className="w-16 text-center">إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.id} className={u.isBlocked ? 'opacity-60' : undefined}>
                        <TableCell>
                          <div className="font-medium" style={{ color: INK }}>{u.name || 'بدون اسم'}</div>
                          {u.pushname && (
                            <div className="text-xs" style={{ color: INK3 }}>{u.pushname}</div>
                          )}
                        </TableCell>
                        <TableCell dir="ltr" className="text-start font-mono text-xs" style={{ fontFamily: MONO }}>
                          +{u.number}
                        </TableCell>
                        <TableCell><StatusBadges user={u} /></TableCell>
                        <TableCell className="text-center font-mono text-xs tabular-nums" style={{ fontFamily: MONO, color: INK2 }}>
                          {u.messagesCount}
                        </TableCell>
                        <TableCell className="text-sm" style={{ color: INK2 }}>{formatRelative(u.lastSeenAt)}</TableCell>
                        <TableCell className="text-center">{actionMenu(u)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>

              {/* Mobile: cards */}
              <ul className="grid gap-3 md:hidden" aria-label="قائمة المستخدمين">
                {users.map((u) => (
                  <li key={u.id}>
                    <Card className={u.isBlocked ? 'opacity-70' : undefined}>
                      <CardContent className="flex items-start justify-between gap-3 p-4">
                        <div className="min-w-0 space-y-1.5">
                          <p className="truncate font-medium" style={{ color: INK }}>{u.name || 'بدون اسم'}</p>
                          <p dir="ltr" className="text-start font-mono text-xs" style={{ fontFamily: MONO, color: INK2 }}>
                            +{u.number}
                          </p>
                          <StatusBadges user={u} />
                          <p className="text-xs" style={{ color: INK3 }}>
                            {arNum(u.messagesCount)} رسالة · {formatRelative(u.lastSeenAt)}
                          </p>
                        </div>
                        {actionMenu(u)}
                      </CardContent>
                    </Card>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}

      {/* Direct message dialog */}
      <Dialog open={msgTarget !== null} onOpenChange={(open) => { if (!open) setMsgTarget(null); }}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: DISPLAY }}>
              رسالة مباشرة
            </DialogTitle>
            <DialogDescription>
              إلى {msgTarget?.name || 'المستخدم'}{' '}
              {msgTarget && (
                <span dir="ltr" className="font-mono text-xs" style={{ fontFamily: MONO }}>+{msgTarget.number}</span>
              )}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            dir="rtl"
            rows={5}
            value={msgText}
            onChange={(e) => setMsgText(e.target.value)}
            placeholder="اكتب رسالتك…"
            aria-label="نص الرسالة"
            autoFocus
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setMsgTarget(null)} disabled={send.busy}>
              إلغاء
            </Button>
            <Button onClick={() => void sendDirect()} disabled={!msgText.trim() || send.busy}>
              {send.busy ? <Loader2 className="animate-spin" aria-hidden /> : <MessageCircle aria-hidden />}
              إرسال
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
