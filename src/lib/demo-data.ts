/**
 * Deterministic demo dataset for "presentation mode" (bot unreachable).
 * Every value is static — no `Date.now()`, no `Math.random()` — so responses
 * are byte-identical on every call. All timestamps are anchored to a fixed
 * demo clock (2026-10-07 20:30 UTC). Data is clearly flagged as demo by the
 * proxy layer (`demo: true`), so it never masquerades as live metrics.
 */
import type {
  AyahPreview,
  BotGroup,
  BotSettings,
  BotStatus,
  BotUser,
  BroadcastRecord,
  LogEntry,
  ScheduleItem,
} from './types';

/** Fixed demo clock — the single source of every demo timestamp. */
const DEMO_ANCHOR_MS = Date.parse('2026-10-07T20:30:00.000Z');

/** Fixed ISO timestamp `minutes` before the demo anchor. */
function ago(minutes: number): string {
  return new Date(DEMO_ANCHOR_MS - minutes * 60_000).toISOString();
}

// ---------------------------------------------------------------------------
// Status — bot appears offline in demo mode
// ---------------------------------------------------------------------------

export const demoStatus: BotStatus = {
  connected: false,
  connecting: false,
  me: null,
  uptimeSec: 184620,
  stats: {
    users: 128,
    groups: 14,
    pendingGroups: 3,
    messagesSent: 2847,
    ayahSent: 412,
    broadcasts: 36,
  },
  version: '1.0.0',
};

// ---------------------------------------------------------------------------
// Connection — fake QR payload + pairing code
// ---------------------------------------------------------------------------

/** Fake WhatsApp QR data (long string starting with "2@"). */
export const demoQr =
  '2@HkBQ9vTR2xsW7YfLmPdKcJnZrXaVeUhGbOsItNyCwQpMfDlAkEjRiSoTtWyNuHgBvCxzLqAmKpFwGdSzEoXuYvTrNcJmBhLgKfQvWeRtZyXnPlOkIjUhYgTfEdCsBaMqNwLoKjIhGfDeSbRaZuYxWvUtQnPlMkJiHgFeDcBaZsXwVuTqRnOlkMjNhGfDeSbRaZuYxWvUtQnPlMk,3AuyVCWZzqefBaGcDbEgHiKlMnPrStUvWxYz0123456789AbCdEfGhIjKlMnOpQrStUvWxYzAbCdEfGhIjKlMnP,';

/** Fake 8-digit pairing code. */
export const demoPairingCode = '73940261';

// ---------------------------------------------------------------------------
// Users — 24 realistic Arabic contacts across several countries
// ---------------------------------------------------------------------------

interface DemoUserSeed {
  name: string;
  pushname: string;
  number: string;
  subscribed: boolean;
  blocked: boolean;
  messagesCount: number;
  lastSeenMin: number; // minutes before the demo anchor
  addedAt: string;
}

const DEMO_USER_SEEDS: readonly DemoUserSeed[] = [
  { name: 'أحمد محمود', pushname: 'أحمد', number: '201012345678', subscribed: true, blocked: false, messagesCount: 187, lastSeenMin: 12, addedAt: '2026-01-05T10:12:00.000Z' },
  { name: 'فاطمة الزهراء', pushname: 'فاطمة', number: '201098765432', subscribed: true, blocked: false, messagesCount: 152, lastSeenMin: 46, addedAt: '2026-01-08T14:33:00.000Z' },
  { name: 'محمد عبد الرحمن', pushname: 'Mohamed', number: '966501234567', subscribed: true, blocked: false, messagesCount: 143, lastSeenMin: 95, addedAt: '2026-01-12T09:20:00.000Z' },
  { name: 'عائشة حسن', pushname: 'عائشة', number: '966555123456', subscribed: true, blocked: false, messagesCount: 138, lastSeenMin: 140, addedAt: '2026-01-15T18:05:00.000Z' },
  { name: 'عمر الخالد', pushname: 'عمر', number: '971501234567', subscribed: true, blocked: false, messagesCount: 121, lastSeenMin: 190, addedAt: '2026-01-19T08:41:00.000Z' },
  { name: 'خديجة إبراهيم', pushname: 'خديجة', number: '971523456789', subscribed: true, blocked: false, messagesCount: 118, lastSeenMin: 240, addedAt: '2026-01-22T12:17:00.000Z' },
  { name: 'يوسف النجار', pushname: 'Yousef', number: '905321234567', subscribed: true, blocked: true, messagesCount: 105, lastSeenMin: 300, addedAt: '2026-01-25T21:02:00.000Z' },
  { name: 'مريم السيد', pushname: 'مريم', number: '905456789123', subscribed: false, blocked: false, messagesCount: 98, lastSeenMin: 390, addedAt: '2026-01-28T07:55:00.000Z' },
  { name: 'علي حسين', pushname: 'علي', number: '447700900123', subscribed: true, blocked: false, messagesCount: 96, lastSeenMin: 460, addedAt: '2026-01-30T16:29:00.000Z' },
  { name: 'زينب محمود', pushname: 'زينب', number: '447700900456', subscribed: true, blocked: false, messagesCount: 87, lastSeenMin: 560, addedAt: '2026-02-02T11:44:00.000Z' },
  { name: 'حمزة عبد الله', pushname: 'حمزة', number: '201222334455', subscribed: false, blocked: false, messagesCount: 84, lastSeenMin: 650, addedAt: '2026-02-05T13:36:00.000Z' },
  { name: 'رقية أحمد', pushname: 'رقية', number: '966533445566', subscribed: true, blocked: false, messagesCount: 79, lastSeenMin: 740, addedAt: '2026-02-08T10:09:00.000Z' },
  { name: 'إبراهيم موسى', pushname: 'إبراهيم', number: '971544556677', subscribed: true, blocked: false, messagesCount: 71, lastSeenMin: 830, addedAt: '2026-02-11T19:27:00.000Z' },
  { name: 'سارة عبد العزيز', pushname: 'سارة', number: '201556677889', subscribed: false, blocked: false, messagesCount: 68, lastSeenMin: 920, addedAt: '2026-02-14T15:58:00.000Z' },
  { name: 'سليمان فؤاد', pushname: 'سليمان', number: '905554433221', subscribed: true, blocked: false, messagesCount: 63, lastSeenMin: 1010, addedAt: '2026-02-17T09:14:00.000Z' },
  { name: 'آمنة سعيد', pushname: 'آمنة', number: '962790123456', subscribed: true, blocked: false, messagesCount: 57, lastSeenMin: 1120, addedAt: '2026-02-19T20:37:00.000Z' },
  { name: 'مصطفى كامل', pushname: 'مصطفى', number: '96555667788', subscribed: true, blocked: false, messagesCount: 52, lastSeenMin: 1250, addedAt: '2026-02-22T17:23:00.000Z' },
  { name: 'نور الهدى', pushname: 'Nour', number: '201234567890', subscribed: true, blocked: false, messagesCount: 49, lastSeenMin: 1390, addedAt: '2026-02-25T08:49:00.000Z' },
  { name: 'عبد الرحمن عادل', pushname: 'Abdelrahman', number: '966512345678', subscribed: true, blocked: true, messagesCount: 44, lastSeenMin: 1530, addedAt: '2026-02-27T14:06:00.000Z' },
  { name: 'هاجر منصور', pushname: 'هاجر', number: '971509876543', subscribed: true, blocked: false, messagesCount: 38, lastSeenMin: 1700, addedAt: '2026-03-01T12:31:00.000Z' },
  { name: 'طه رمضان', pushname: 'طه', number: '201098765431', subscribed: false, blocked: false, messagesCount: 31, lastSeenMin: 1900, addedAt: '2026-03-04T18:19:00.000Z' },
  { name: 'سلمى فتحي', pushname: 'سلمى', number: '966599887766', subscribed: true, blocked: false, messagesCount: 27, lastSeenMin: 2200, addedAt: '2026-03-07T09:52:00.000Z' },
  { name: 'بلال مرسي', pushname: 'Bilal', number: '447911223344', subscribed: true, blocked: false, messagesCount: 19, lastSeenMin: 2600, addedAt: '2026-03-15T10:27:00.000Z' },
  { name: 'أسماء حجازي', pushname: 'أسماء', number: '905331122334', subscribed: true, blocked: false, messagesCount: 11, lastSeenMin: 3200, addedAt: '2026-03-21T21:08:00.000Z' },
];

export const demoUsers: BotUser[] = DEMO_USER_SEEDS.map((seed, index) => ({
  id: index + 1,
  jid: `${seed.number}@s.whatsapp.net`,
  name: seed.name,
  number: seed.number,
  pushname: seed.pushname,
  isBlocked: seed.blocked,
  subscribed: seed.subscribed,
  lastSeenAt: ago(seed.lastSeenMin),
  messagesCount: seed.messagesCount,
  addedAt: seed.addedAt,
}));

// ---------------------------------------------------------------------------
// Groups — 8 approved + 3 pending join requests
// ---------------------------------------------------------------------------

interface DemoGroupSeed {
  name: string;
  jid: string;
  memberCount: number;
  addedAt: string;
}

const APPROVED_GROUP_SEEDS: readonly DemoGroupSeed[] = [
  { name: 'أهل القرآن', jid: '120363017239485601@g.us', memberCount: 250, addedAt: '2026-01-10T08:00:00.000Z' },
  { name: 'ذكر الصباحين', jid: '120363026173849501@g.us', memberCount: 180, addedAt: '2026-01-18T10:30:00.000Z' },
  { name: 'حديث شريف يومي', jid: '120363031562839401@g.us', memberCount: 320, addedAt: '2026-01-25T19:45:00.000Z' },
  { name: 'رياض الصالحين', jid: '120363047293846501@g.us', memberCount: 210, addedAt: '2026-02-03T09:15:00.000Z' },
  { name: 'تفسير مبسط', jid: '120363058374629301@g.us', memberCount: 95, addedAt: '2026-02-12T17:20:00.000Z' },
  { name: 'أذكار النبي ﷺ', jid: '120363069281753401@g.us', memberCount: 140, addedAt: '2026-02-20T12:00:00.000Z' },
  { name: 'الفتاوى الميسرة', jid: '120363076192847301@g.us', memberCount: 75, addedAt: '2026-03-01T14:35:00.000Z' },
  { name: 'صحيح البخاري', jid: '120363084936251701@g.us', memberCount: 160, addedAt: '2026-03-10T11:10:00.000Z' },
];

const PENDING_GROUP_SEEDS: readonly DemoGroupSeed[] = [
  { name: 'جماعة مسجد النور', jid: '120363091738265401@g.us', memberCount: 65, addedAt: '2026-10-06T09:22:00.000Z' },
  { name: 'رفقاء الطريق', jid: '120363105938472601@g.us', memberCount: 42, addedAt: '2026-10-06T21:47:00.000Z' },
  { name: 'دروس العقيدة', jid: '120363116382947301@g.us', memberCount: 88, addedAt: '2026-10-07T13:05:00.000Z' },
];

function toGroups(seeds: readonly DemoGroupSeed[], approved: boolean, pending: boolean, idOffset: number): BotGroup[] {
  return seeds.map((seed, index) => ({
    id: idOffset + index + 1,
    jid: seed.jid,
    name: seed.name,
    size: seed.memberCount,
    memberCount: seed.memberCount,
    approved,
    pending,
    addedAt: seed.addedAt,
  }));
}

export const demoGroupsApproved: BotGroup[] = toGroups(APPROVED_GROUP_SEEDS, true, false, 0);
export const demoGroupsPending: BotGroup[] = toGroups(PENDING_GROUP_SEEDS, false, true, APPROVED_GROUP_SEEDS.length);

// ---------------------------------------------------------------------------
// Broadcasts — 12 real, dignified Islamic messages
// ---------------------------------------------------------------------------

export const demoBroadcasts: BroadcastRecord[] = [
  {
    id: 36,
    text: '﴿فَقُلْتُ اسْتَغْفِرُوا رَبَّكُمْ إِنَّهُ كَانَ غَفَّارًا﴾\nأكثِروا من الاستغفار؛ فهو مفتاح الرزق وتفريج الهمّ.',
    targets: 'users',
    sent: 122,
    failed: 1,
    sentAt: '2026-10-07T20:00:00.000Z',
  },
  {
    id: 35,
    text: 'تذكير الصباح: أذكار الصباح درعُ يومك؛ اقرأها بعد الفجر بقلبٍ حاضر.',
    targets: 'users',
    sent: 123,
    failed: 1,
    sentAt: '2026-10-07T08:00:00.000Z',
  },
  {
    id: 34,
    text: 'قال رسول الله ﷺ: «الطُّهُورُ شَطْرُ الإِيمَانِ» — رواه مسلم.\nارفعوا همتكم في الطهارة والمحافظة على الصلوات.',
    targets: 'groups',
    sent: 8,
    failed: 0,
    sentAt: '2026-10-06T20:00:00.000Z',
  },
  {
    id: 33,
    text: '﴿أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ﴾\nلا تنأَوا عن ذكر الله؛ فهو سكينة القلوب ونورها.',
    targets: 'users',
    sent: 121,
    failed: 2,
    sentAt: '2026-10-05T14:00:00.000Z',
  },
  {
    id: 32,
    text: 'خطوة كل يوم: احفظوا آية واحدة وراجعوا ما حفظتم؛ فالمداومة القليلة خير من الكثيرة المنقطعة.',
    targets: 'users',
    sent: 120,
    failed: 2,
    sentAt: '2026-10-04T20:00:00.000Z',
  },
  {
    id: 31,
    text: 'قال رسول الله ﷺ: «تَبَسُّمُكَ فِي وَجْهِ أَخِيكَ لَكَ صَدَقَةٌ» — رواه الترمذي.\nافشوا السلام، وأطعموا الطعام، وصلوا الأرحام.',
    targets: 'all',
    sent: 139,
    failed: 2,
    sentAt: '2026-10-03T09:00:00.000Z',
  },
  {
    id: 30,
    text: '*تذكير الجمعة المباركة*\nاقرؤوا سورة الكهف، وأكثروا الصلاة على النبي ﷺ، واغتنموا ساعة الاستجابة قبل المغرب.',
    targets: 'all',
    sent: 141,
    failed: 3,
    sentAt: '2026-10-02T09:05:00.000Z',
  },
  {
    id: 29,
    text: 'من أدعية القرآن: ﴿رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ﴾\nادعوه بيقينٍ وثقة.',
    targets: 'users',
    sent: 122,
    failed: 1,
    sentAt: '2026-10-01T20:00:00.000Z',
  },
  {
    id: 28,
    text: 'اقتباس اليوم:\nقال رسول الله ﷺ: «الدُّعَاءُ هُوَ الْعِبَادَةُ» — رواه الترمذي.\nألِحُّوا في الدعاء؛ فهو مفتاح كل خير.',
    targets: 'groups',
    sent: 8,
    failed: 0,
    sentAt: '2026-09-30T14:00:00.000Z',
  },
  {
    id: 27,
    text: '﴿وَذَكِّرْ فَإِنَّ الذِّكْرَىٰ تَنْفَعُ الْمُؤْمِنِينَ﴾\nحافظوا على وِردٍ يومي من كتاب الله ولو صفحة واحدة.',
    targets: 'users',
    sent: 121,
    failed: 2,
    sentAt: '2026-09-29T08:00:00.000Z',
  },
  {
    id: 26,
    text: 'مبادرة القراءة الجماعية لسورة الكهف تُستأنف الجمعة القادمة بإذن الله — شاركونا القراءة والدعاء.',
    targets: 'groups',
    sent: 8,
    failed: 0,
    sentAt: '2026-09-28T20:00:00.000Z',
  },
  {
    id: 25,
    text: 'ملخص الأسبوع في خدمة Hadith Ai.BOT:\n84 آية أُرسلت، و14 اقتباسًا، و6 بثوث عامة. شكرًا لصحبتكم الطيبة.',
    targets: 'all',
    sent: 137,
    failed: 3,
    sentAt: '2026-09-25T19:00:00.000Z',
  },
];

// ---------------------------------------------------------------------------
// Schedules — 5 tasks with correct crons + Arabic descriptions
// ---------------------------------------------------------------------------

export const demoSchedules: ScheduleItem[] = [
  {
    key: 'friday-reminder',
    title: 'تذكير الجمعة',
    enabled: true,
    cron: '0 9 * * 5',
    description: 'تذكير أسبوعي كل جمعة بقراءة سورة الكهف والصلاة على النبي ﷺ والتبكير إلى الصلاة.',
    lastRunAt: '2026-10-02T09:00:00.000Z',
    nextRunAt: '2026-10-09T09:00:00.000Z',
  },
  {
    key: 'ayah-interval',
    title: 'الآيات القرآنية الصوتية',
    enabled: true,
    cron: '0 * * * *',
    description: 'إرسال آية قرآنية بصوت الشيخ رعد الكردي كل 60 دقيقة إلى المشتركين وفق نطاق السور المحدد.',
    lastRunAt: '2026-10-07T20:00:00.000Z',
    nextRunAt: '2026-10-07T21:00:00.000Z',
  },
  {
    key: 'ai-quotes',
    title: 'اقتباسات إسلامية ذكية',
    enabled: true,
    cron: '0 8,14,20 * * *',
    description: 'توليد اقتباس إسلامي بالذكاء الاصطناعي مع تخريج مختصر عند الحديث، وإرساله في المواقيت المحددة.',
    lastRunAt: '2026-10-07T14:00:00.000Z',
    nextRunAt: '2026-10-08T08:00:00.000Z',
  },
  {
    key: 'morning-adhkar',
    title: 'أذكار الصباح',
    enabled: true,
    cron: '0 6 * * *',
    description: 'إرسال أذكار الصباح مشكَّلة من مصادر موثوقة كل يوم في السادسة صباحًا.',
    lastRunAt: '2026-10-07T06:00:00.000Z',
    nextRunAt: '2026-10-08T06:00:00.000Z',
  },
  {
    key: 'evening-adhkar',
    title: 'أذكار المساء',
    enabled: true,
    cron: '0 18 * * *',
    description: 'إرسال أذكار المساء في السادسة مساءً كل يوم.',
    lastRunAt: '2026-10-07T18:00:00.000Z',
    nextRunAt: '2026-10-08T18:00:00.000Z',
  },
];

// ---------------------------------------------------------------------------
// Settings — full BotSettings per the shared contract
// ---------------------------------------------------------------------------

export const demoSettings: BotSettings = {
  aiQuoteTimes: '08:00,14:00,20:00',
  quranIntervalMin: 60,
  fridayReminderTime: '09:00',
  autoReply: true,
  autoReplyPreamble:
    'أجيب عن الأسئلة العامة اليومية بإيجاز وتقدير. وأسئلة الفقه التفصيلية أُحيل فيها إلى أهل العلم الثقات؛ فديننا يُؤخذ عن أهله.',
  reciter: 'الشيخ رعد الكردي',
  surahRange: '1-114',
  greeting:
    'السلام عليكم ورحمة الله وبركاته\nأهلًا بك في *Hadith Ai.BOT* — مساعدك الإسلامي اليومي من منظمة حديث الإسلامية.\nأرسل *مساعدة* لعرض الخدمات، أو *اشتراك* لتنشيط الرسائل اليومية.',
  orgName: 'منظمة حديث الإسلامية',
  botName: 'Hadith Ai.BOT',
  founder: 'د. طارق الفارس',
  company: 'UNIRAL للتطوير التقني والعلمي وهندسة الذكاء الاصطناعي',
  modelName: 'Hadith Ai-1.5 Flash Pro',
};

// ---------------------------------------------------------------------------
// Logs — 40 mixed entries (info / warn / error across 6 types)
// ---------------------------------------------------------------------------

interface DemoLogSeed {
  level: LogEntry['level'];
  type: string;
  message: string;
  meta?: string;
}

/** Fixed minutes-ago offsets, oldest → newest (deterministic). */
const LOG_OFFSETS_MIN: readonly number[] = [
  3077, 2880, 2690, 2510, 2320, 2140, 1960, 1780, 1600, 1420,
  1250, 1100, 980, 870, 760, 680, 610, 560, 520, 480,
  420, 350, 290, 240, 200, 170, 145, 122, 101, 84,
  68, 55, 43, 34, 26, 19, 14, 9, 5, 2,
];

/** Seed rows are listed oldest → newest, aligned with LOG_OFFSETS_MIN. */
const LOG_SEEDS: readonly DemoLogSeed[] = [
  { level: 'info', type: 'api', message: 'بدأ تشغيل خادم البوت — واجهة REST جاهزة', meta: 'version=1.0.0' },
  { level: 'info', type: 'wa', message: 'تمت استعادة جلسة واتساب من بيانات المصادقة المحفوظة' },
  { level: 'info', type: 'schedule', message: 'تحميل الجدولات: 5 جدولات نشطة', meta: 'schedules=5' },
  { level: 'info', type: 'quran', message: 'أُرسلت آية (الإسراء 88) صوتيًا إلى 117 مشتركًا', meta: 'reciter=ar.raadalkurdi' },
  { level: 'info', type: 'ai', message: 'توليد اقتباس إسلامي عبر Hadith Ai-1.5 Flash Pro', meta: 'tokens=214 latency=842ms' },
  { level: 'warn', type: 'quran', message: 'تعذّر جلب الصوت من cdn.islamic.network — التحويل إلى everyayah', meta: 'ayah=2:186' },
  { level: 'info', type: 'broadcast', message: 'اكتمل بث تذكير إلى جميع المستخدمين', meta: 'sent=122 failed=2' },
  { level: 'info', type: 'wa', message: 'مستخدم جديد أرسل «اشتراك» — أُضيف إلى قائمة المشتركين', meta: 'jid=966512345678@s.whatsapp.net' },
  { level: 'info', type: 'api', message: 'طلب معتمد من اللوحة: GET /api/status' },
  { level: 'warn', type: 'ai', message: 'تجاوز حد الطلبات مؤقتًا — تفعيل الردود الموجزة الاحتياطية' },
  { level: 'info', type: 'schedule', message: 'تحديث مواعيد الجدولات بعد تعديل الإعدادات من اللوحة', meta: 'schedules=5' },
  { level: 'info', type: 'quran', message: 'أُرسلت آية (الرحمن 78) صوتيًا إلى 120 مشتركًا', meta: 'reciter=ar.raadalkurdi' },
  { level: 'error', type: 'ai', message: 'فشل نداء نموذج الذكاء الاصطناعي (مهلة 30 ثانية)', meta: 'attempt=1/3' },
  { level: 'info', type: 'ai', message: 'نجحت إعادة المحاولة — تم توليد الرد بنجاح', meta: 'attempt=2 latency=907ms' },
  { level: 'info', type: 'wa', message: 'رد تلقائي ذكي أُرسل إلى مستخدم يسأل عن وِرد الحفظ', meta: 'jid=201098765432@s.whatsapp.net' },
  { level: 'info', type: 'broadcast', message: 'بث اقتباس إسلامي إلى الجروبات المعتمدة', meta: 'sent=8 failed=0' },
  { level: 'warn', type: 'wa', message: 'رسالة واردة من مستخدم محظور — تم تجاهلها', meta: 'jid=905321234567@s.whatsapp.net' },
  { level: 'info', type: 'api', message: 'طلب معتمد من اللوحة: PUT /api/settings' },
  { level: 'info', type: 'quran', message: 'جلب نص آية (يس 58) من alquran.cloud', meta: 'edition=quran-uthmani' },
  { level: 'info', type: 'wa', message: 'استعادة اتصال واتساب بعد انقطاع مؤقت', meta: 'downtime=42s' },
  { level: 'error', type: 'wa', message: 'انقطع اتصال واتساب — بدء إعادة الاتصال', meta: 'attempt=1' },
  { level: 'info', type: 'schedule', message: 'جدولة «الآيات القرآنية الصوتية»: الإرسال التالي بعد 60 دقيقة' },
  { level: 'info', type: 'ai', message: 'اختبار النموذج من لوحة الإدارة اكتمل بنجاح', meta: 'latency=718ms' },
  { level: 'info', type: 'broadcast', message: 'اكتمل بث حديث شريف إلى المستخدمين', meta: 'sent=121 failed=1' },
  { level: 'warn', type: 'quran', message: 'تعذّر جلب الصوت من everyayah — التحويل إلى المقرئ البديل مع تنويه', meta: 'ayah=33:56' },
  { level: 'info', type: 'quran', message: 'أُرسلت آية (الأحزاب 56) صوتيًا إلى 119 مشتركًا', meta: 'reciter=ar.raadalkurdi' },
  { level: 'info', type: 'api', message: 'طلب معتمد من اللوحة: POST /api/quran/send-now' },
  { level: 'info', type: 'wa', message: 'مستخدم جدّد الاشتراك بعد إلغاء سابق', meta: 'jid=96555667788@s.whatsapp.net' },
  { level: 'info', type: 'schedule', message: 'تنفيذ جدولة «أذكار المساء» في موعدها', meta: 'cron=0 18 * * *' },
  { level: 'info', type: 'ai', message: 'توليد اقتباس بحديث نبوي مع تخريج مختصر', meta: 'tokens=196' },
  { level: 'error', type: 'broadcast', message: 'فشل إرسال البث إلى رقمين غير مسجلين في واتساب', meta: 'failed=2' },
  { level: 'info', type: 'quran', message: 'أُرسلت آية (المؤمنون 1) صوتيًا إلى 118 مشتركًا' },
  { level: 'info', type: 'wa', message: 'رد تلقائي ذكي أُرسل إلى مستخدم يسأل عن أذكار النوم', meta: 'jid=971544556677@s.whatsapp.net' },
  { level: 'info', type: 'api', message: 'طلب معتمد من اللوحة: GET /api/logs?limit=50' },
  { level: 'warn', type: 'ai', message: 'سؤال فقهي تفصيلي — أُحيل المستخدم إلى أهل العلم' },
  { level: 'info', type: 'schedule', message: 'تحقق من مواعيد اقتباسات الذكاء الاصطناعي (08:00، 14:00، 20:00)' },
  { level: 'warn', type: 'quran', message: 'ffmpeg غير متوفر — سيُرسل الصوت بصيغة mp3 بدل ogg', meta: 'format=mp3' },
  { level: 'info', type: 'wa', message: 'تحديث حالات آخر ظهور لعدد من المشتركين', meta: 'users=17' },
  { level: 'warn', type: 'api', message: 'طلب مرفوض: رمز API غير صالح', meta: 'status=401' },
  { level: 'info', type: 'wa', message: 'رسالة جديدة من أحمد محمود — جارٍ توليد الرد', meta: 'jid=201012345678@s.whatsapp.net' },
];

/** Chronological (oldest → newest). The proxy returns them newest-first. */
export const demoLogs: LogEntry[] = LOG_SEEDS.map((seed, index) => ({
  id: index + 1,
  at: ago(LOG_OFFSETS_MIN[index]),
  level: seed.level,
  type: seed.type,
  message: seed.message,
  meta: seed.meta ?? null,
}));

// ---------------------------------------------------------------------------
// Quran / quote / AI test samples
// ---------------------------------------------------------------------------

/** Ayat al-Kursi (Al-Baqarah 255) — full text, standard Uthmani rendering. */
export const demoAyah: AyahPreview = {
  surah: 2,
  ayah: 255,
  surahName: 'البقرة',
  text: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ ۗ مَنْ ذَا الَّذِي يَشْفَعُ عِنْدَهُ إِلَّا بِإِذْنِهِ ۚ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ ۖ وَلَا يُحِيطُونَ بِشَيْءٍ مِنْ عِلْمِهِ إِلَّا بِمَا شَاءَ ۚ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ ۖ وَلَا يَئُودُهُ حِفْظُهُمَا ۚ وَهُوَ الْعَلِيُّ الْعَظِيمُ',
  audioSent: true,
};

/** Short famous hadith with brief attribution. */
export const demoQuote: string =
  'قال رسول الله ﷺ: «إنما الأعمال بالنيات، وإنما لكل امرئ ما نوى» — متفق عليه';

/** Canned model answer for the panel's "test AI" action. */
export const demoAiReply: string =
  'وعليكم السلام ورحمة الله وبركاته، وجزاك الله خيرًا.\n' +
  'أنصحك بخصوص وِرد الحفظ بما يلي: خصّص وقتًا ثابتًا لا يتغير (بعد الفجر مثلًا)، واجعل الوِرد قليلًا دائمًا لا كثيرًا منقطعًا، وراجع دائمًا ما حفظت قبل أن تزيد جديدًا.\n' +
  'قال رسول الله ﷺ: «اقرؤوا القرآن فإنه يأتي يوم القيامة شفيعًا لأصحابه» — رواه مسلم.\n' +
  'إن أحببت أعدّ لك خطة حفظ أسبوعية ميسّرة بإذن الله.\n' +
  '— Hadith Ai.BOT · نموذج Hadith Ai-1.5 Flash Pro';
