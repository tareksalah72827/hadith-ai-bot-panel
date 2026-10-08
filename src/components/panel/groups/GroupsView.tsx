'use client';

/**
 * GroupsView — pending group-join requests awaiting admin approval,
 * plus the list of approved broadcast groups.
 */
import { useState } from 'react';
import type { ReactNode } from 'react';
import { Check, Info, Loader2, RefreshCw, UsersRound, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useBotMutation, useBotResource } from '@/components/panel/shared/hooks';
import { api } from '@/lib/browser-api';
import type { BotGroup } from '@/lib/types';

// ---- Theme tokens (var-only, with shadcn fallbacks) ----
const INK = 'var(--color-ink, var(--foreground))';
const INK2 = 'var(--color-ink-2, var(--muted-foreground))';
const INK3 = 'var(--color-ink-3, var(--muted-foreground))';
const PAPER2 = 'var(--color-paper-2, var(--muted))';
const DANGER = 'var(--color-danger, var(--destructive))';
const PRIMARY_DEEP = 'var(--color-primary-deep, var(--primary))';
const SUCCESS_SOFT = 'color-mix(in oklab, var(--color-success, var(--color-primary)) 14%, var(--color-paper, var(--background)))';
const ACCENT_SOFT = 'color-mix(in oklab, var(--color-accent, var(--accent)) 18%, var(--color-paper, var(--background)))';
const DISPLAY = "var(--font-display, 'Amiri', serif)";

const arNum = (n: number): string => n.toLocaleString('ar-EG');

/** "قبل يومين" style relative time in Arabic. */
function formatRelative(iso: string | null): string {
  if (!iso) return '—';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '—';
  const diff = Math.round((then - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat('ar-EG', { numeric: 'auto' });
  const abs = Math.abs(diff);
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
        <p className="font-medium" style={{ color: DANGER }}>تعذّر تحميل بيانات الجروبات</p>
        <p className="text-sm" style={{ color: INK2 }}>{message}</p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw aria-hidden /> إعادة المحاولة
        </Button>
      </CardContent>
    </Card>
  );
}

export default function GroupsView(): ReactNode {
  const { toast } = useToast();
  // The bot may answer either with a flat list (pending flag) or a separate array
  const res = useBotResource<{ groups: BotGroup[]; pending?: BotGroup[] }>('/api/bot/groups', 12000);

  const all = res.data?.groups ?? [];
  const pending = res.data?.pending ?? all.filter((g) => g.pending);
  const approved = all.filter((g) => !g.pending && g.approved);

  const act = useBotMutation<{ ok: true }>();
  // "approve:3" / "reject:3" — which group button is busy
  const [acting, setActing] = useState<string | null>(null);

  const resolve = async (group: BotGroup, action: 'approve' | 'reject'): Promise<void> => {
    setActing(`${action}:${group.id}`);
    const r = await act.run(() => api.post(`/api/bot/groups/${group.id}/${action}`));
    setActing(null);
    if (r.ok) {
      toast({
        title: action === 'approve' ? 'اعتُمد الجروب' : 'رُفض الطلب',
        description:
          action === 'approve'
            ? `سيبدأ «${group.name}» باستقبال بثّ البوت`
            : `أُزيل طلب «${group.name}» من القائمة`,
      });
      res.refresh();
    } else {
      toast({
        title: action === 'approve' ? 'تعذّر الاعتماد' : 'تعذّر الرفض',
        description: r.error,
        variant: 'destructive',
      });
    }
  };

  const showSkeleton = res.loading && !res.data;
  const showError = res.error !== null && !res.data;

  return (
    <div className="space-y-6">
      <ViewHeader
        title="الجروبات"
        description="طلبات الانضمام المعلقة والجروبات المعتمدة التي يبثّ إليها البوت."
      />

      {/* Policy banner — mirrors the requirement: bot joins as member, stays inactive until approval */}
      <Card style={{ backgroundColor: PAPER2, borderColor: 'var(--color-line, var(--border))' }}>
        <CardContent className="flex items-start gap-3 p-4">
          <Info className="mt-0.5 size-5 shrink-0" style={{ color: PRIMARY_DEEP }} aria-hidden />
          <p className="text-sm leading-relaxed" style={{ color: INK2 }}>
            يُضاف البوت إلى الجروب كعضو، ويبقى غير مفعّل حتى موافقة المسؤول من هنا — تمامًا كما في المتطلبات.
          </p>
        </CardContent>
      </Card>

      {showError ? (
        <ErrorCard message={res.error ?? ''} onRetry={res.refresh} />
      ) : showSkeleton ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full max-w-md" />
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : (
        <Tabs defaultValue="pending">
          <TabsList className="grid h-auto w-full grid-cols-2 sm:w-auto sm:inline-flex">
            <TabsTrigger value="pending" className="gap-2 px-4 py-2">
              طلبات معلقة
              <Badge variant="secondary" className="tabular-nums">{arNum(pending.length)}</Badge>
            </TabsTrigger>
            <TabsTrigger value="approved" className="gap-2 px-4 py-2">
              الجروبات المعتمدة
              <Badge variant="secondary" className="tabular-nums">{arNum(approved.length)}</Badge>
            </TabsTrigger>
          </TabsList>

          {/* Pending requests */}
          <TabsContent value="pending" className="mt-4 space-y-4">
            {pending.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
                  <UsersRound className="size-10" style={{ color: INK3 }} aria-hidden />
                  <p className="font-medium" style={{ color: INK }}>لا طلبات معلقة</p>
                  <p className="max-w-sm text-sm" style={{ color: INK2 }}>
                    حين يُضاف البوت إلى جروب جديد، يظهر طلبه هنا بانتظار موافقتك قبل بدء البث.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="طلبات الانضمام المعلقة">
                {pending.map((g) => {
                  const members = g.memberCount ?? g.size ?? 0;
                  const approveBusy = acting === `approve:${g.id}`;
                  const rejectBusy = acting === `reject:${g.id}`;
                  return (
                    <li key={g.id}>
                      <Card className="h-full">
                        <CardContent className="flex h-full flex-col gap-3 p-4 sm:p-6">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-base font-semibold" style={{ color: INK }}>{g.name}</p>
                              <p className="mt-1 text-sm" style={{ color: INK2 }}>
                                {arNum(members)} عضوًا · أُضيف {formatRelative(g.addedAt)}
                              </p>
                            </div>
                            <Badge variant="outline" style={{ backgroundColor: ACCENT_SOFT, color: INK, borderColor: 'transparent' }}>
                              بانتظار الموافقة
                            </Badge>
                          </div>
                          <div className="mt-auto grid grid-cols-2 gap-2 pt-2">
                            <Button onClick={() => void resolve(g, 'approve')} disabled={acting !== null} className="h-11 sm:h-9">
                              {approveBusy ? <Loader2 className="animate-spin" aria-hidden /> : <Check aria-hidden />}
                              موافقة
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => void resolve(g, 'reject')}
                              disabled={acting !== null}
                              className="h-11 border-[1.5px] sm:h-9"
                              style={{ borderColor: DANGER, color: DANGER }}
                            >
                              {rejectBusy ? <Loader2 className="animate-spin" aria-hidden /> : <X aria-hidden />}
                              رفض
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </li>
                  );
                })}
              </ul>
            )}
          </TabsContent>

          {/* Approved groups */}
          <TabsContent value="approved" className="mt-4">
            {approved.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
                  <UsersRound className="size-10" style={{ color: INK3 }} aria-hidden />
                  <p className="font-medium" style={{ color: INK }}>لا جروبات معتمدة بعد</p>
                  <p className="max-w-sm text-sm" style={{ color: INK2 }}>
                    اعتمد الطلبات المعلقة لتظهر الجروبات هنا وتستقبل البث الدوري.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Desktop: table */}
                <ScrollArea className="hidden md:block" dir="rtl">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>اسم الجروب</TableHead>
                        <TableHead className="text-center">الأعضاء</TableHead>
                        <TableHead>منذ متى</TableHead>
                        <TableHead>الحالة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {approved.map((g) => (
                        <TableRow key={g.id}>
                          <TableCell className="font-medium" style={{ color: INK }}>{g.name}</TableCell>
                          <TableCell className="text-center font-mono text-xs tabular-nums" style={{ color: INK2 }}>
                            {arNum(g.memberCount ?? g.size ?? 0)}
                          </TableCell>
                          <TableCell className="text-sm" style={{ color: INK2 }}>{formatRelative(g.addedAt)}</TableCell>
                          <TableCell>
                            <Badge style={{ backgroundColor: SUCCESS_SOFT, color: PRIMARY_DEEP, borderColor: 'transparent' }}>
                              نشط
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>

                {/* Mobile: cards */}
                <ul className="grid gap-3 md:hidden" aria-label="الجروبات المعتمدة">
                  {approved.map((g) => (
                    <li key={g.id}>
                      <Card>
                        <CardContent className="flex items-center justify-between gap-3 p-4">
                          <div className="min-w-0">
                            <p className="truncate font-medium" style={{ color: INK }}>{g.name}</p>
                            <p className="mt-0.5 text-sm" style={{ color: INK2 }}>
                              {arNum(g.memberCount ?? g.size ?? 0)} عضوًا · منذ {formatRelative(g.addedAt)}
                            </p>
                          </div>
                          <Badge style={{ backgroundColor: SUCCESS_SOFT, color: PRIMARY_DEEP, borderColor: 'transparent' }}>
                            نشط
                          </Badge>
                        </CardContent>
                      </Card>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
