'use client';

/**
 * Navigation contract for the whole panel (Agent B scope, shared with the
 * other views). Views are addressed by hash — `#/overview`, `#/users` … —
 * and page.tsx listens to `hashchange` to swap the active view.
 */
import {
  LayoutDashboard,
  Link2,
  Users,
  UsersRound,
  Megaphone,
  CalendarClock,
  BookOpen,
  Sparkles,
  Settings,
  ScrollText,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  key: string;
  label: string;
  icon: string;
}

export const NAV_ITEMS: NavItem[] = [
  { key: 'overview', label: 'نظرة عامة', icon: 'LayoutDashboard' },
  { key: 'connection', label: 'الاتصال', icon: 'Link2' },
  { key: 'users', label: 'المستخدمون', icon: 'Users' },
  { key: 'groups', label: 'الجروبات', icon: 'UsersRound' },
  { key: 'broadcast', label: 'البث والرسائل', icon: 'Megaphone' },
  { key: 'schedules', label: 'المجدولات', icon: 'CalendarClock' },
  { key: 'quran', label: 'القرآن الكريم', icon: 'BookOpen' },
  { key: 'ai', label: 'الذكاء الاصطناعي', icon: 'Sparkles' },
  { key: 'settings', label: 'الإعدادات', icon: 'Settings' },
  { key: 'logs', label: 'السجلات', icon: 'ScrollText' },
];

/** lucide name → component map, so any view can render NAV_ITEMS icons. */
export const NAV_ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  Link2,
  Users,
  UsersRound,
  Megaphone,
  CalendarClock,
  BookOpen,
  Sparkles,
  Settings,
  ScrollText,
};

/** Change the active view by hash (page.tsx reacts to it). */
export function navigate(view: string): void {
  window.location.hash = `#/${view}`;
}

/** Arabic label of a view key (fallback: panel title). */
export function navLabel(view: string): string {
  return NAV_ITEMS.find((item) => item.key === view)?.label ?? 'لوحة التحكم';
}
