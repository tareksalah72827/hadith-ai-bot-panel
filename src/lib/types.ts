/**
 * Shared API contract types — Hadith Ai.BOT panel ↔ bot.
 * Mirrors the Bot REST API in PROJECT_SPEC.md §3. Do not rename fields.
 */

export interface BotMe {
  jid: string;
  name: string;
  number: string;
}

export interface BotStats {
  users: number;
  groups: number;
  pendingGroups: number;
  messagesSent: number;
  ayahSent: number;
  broadcasts: number;
}

export interface BotStatus {
  connected: boolean;
  connecting: boolean;
  me: BotMe | null;
  uptimeSec: number;
  stats: BotStats;
  version: string;
}

export interface QrResponse {
  qr: string | null;
  state: 'waiting' | 'connecting' | 'connected' | 'disconnected';
}

export interface PairResponse {
  pairingCode: string | null;
  message?: string;
}

export interface BotUser {
  id: number;
  jid: string;
  name: string;
  number: string;
  pushname: string;
  isBlocked: boolean;
  subscribed: boolean;
  lastSeenAt: string | null;
  messagesCount: number;
  addedAt: string;
}

export interface BotGroup {
  id: number;
  jid: string;
  name: string;
  size: number;
  memberCount: number;
  approved: boolean;
  pending: boolean;
  addedAt: string;
}

export interface BroadcastRecord {
  id: number;
  text: string;
  targets: 'all' | 'users' | 'groups';
  sent: number;
  failed: number;
  sentAt: string;
}

export interface ScheduleItem {
  key: string;
  title: string;
  enabled: boolean;
  cron: string;
  description: string;
  lastRunAt: string | null;
  nextRunAt: string | null;
}

export interface BotSettings {
  aiQuoteTimes: string;
  quranIntervalMin: number;
  fridayReminderTime: string;
  autoReply: boolean;
  autoReplyPreamble: string;
  reciter: string;
  surahRange: string;
  greeting: string;
  orgName: string;
  botName: string;
  founder: string;
  company: string;
  modelName: string;
}

export interface LogEntry {
  id: number;
  at: string;
  level: 'info' | 'warn' | 'error';
  type: string;
  message: string;
  meta: string | null;
}

export interface AyahPreview {
  surah: number;
  ayah: number;
  surahName: string;
  text: string;
  audioSent: boolean;
}

export interface ApiOk {
  ok: true;
  [key: string]: unknown;
}

export interface ApiErr {
  ok: false;
  error: string;
}

export type ApiResponse<T> = (T & { ok: true }) | ApiErr;

export interface MeResponse {
  authenticated: boolean;
  username?: string;
}
