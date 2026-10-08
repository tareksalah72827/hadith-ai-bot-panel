'use client';

/**
 * Hadith Ai.BOT — Admin panel root (/).
 * Single route per sandbox constraint: the whole app lives here as a
 * client-side SPA. Hash routing (#/overview, #/users...) switches views,
 * so the URL is shareable and the browser back button works.
 */
import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import dynamic from 'next/dynamic';

import { api } from '@/lib/browser-api';
import LoginView from '@/components/panel/login/LoginView';
import AppShell from '@/components/panel/shell/AppShell';
import DashboardView from '@/components/panel/dashboard/DashboardView';
import { navigate, NAV_ITEMS } from '@/components/panel/shared/nav';

/* Agent-C feature views — code-split so the first paint stays fast */
const UsersView = dynamic(() => import('@/components/panel/users/UsersView'), { ssr: false });
const GroupsView = dynamic(() => import('@/components/panel/groups/GroupsView'), { ssr: false });
const BroadcastView = dynamic(() => import('@/components/panel/broadcast/BroadcastView'), { ssr: false });
const SchedulesView = dynamic(() => import('@/components/panel/schedules/SchedulesView'), { ssr: false });
const QuranView = dynamic(() => import('@/components/panel/quran/QuranView'), { ssr: false });
const AiView = dynamic(() => import('@/components/panel/ai/AiView'), { ssr: false });
const SettingsView = dynamic(() => import('@/components/panel/settings/SettingsView'), { ssr: false });
const LogsView = dynamic(() => import('@/components/panel/logs/LogsView'), { ssr: false });
const ConnectionView = dynamic(() => import('@/components/panel/connection/ConnectionView'), { ssr: false });

/** Valid view keys straight from the nav contract (source of truth). */
const VALID_VIEWS: string[] = NAV_ITEMS.map((item) => item.key);

function readHashView (): string {
  if (typeof window === 'undefined') return 'overview';
  const raw = window.location.hash.replace(/^#\/?/, '').split('?')[0].trim();
  return VALID_VIEWS.includes(raw) ? raw : 'overview';
}

export default function Page (): ReactNode {
  const [authState, setAuthState] = useState<'checking' | 'anonymous' | 'authed'>('checking');
  const [username, setUsername] = useState<string>('');
  // lazy init: runs once on the client (server falls back to 'overview')
  const [view, setView] = useState<string>(() => readHashView());

  /* ---------- boot: restore session ---------- */
  useEffect(() => {
    let alive = true;
    void (async () => {
      const r = await api.me();
      if (!alive) return;
      if (r.ok && r.authenticated) {
        setUsername(r.username ?? 'المسؤول');
        setAuthState('authed');
      } else {
        setAuthState('anonymous');
      }
    })();
    return () => { alive = false; };
  }, []);

  /* ---------- hash routing (back/forward + navigate()) ---------- */
  useEffect(() => {
    const onHash = () => setView(readHashView());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  /* ---------- auth flow ---------- */
  const handleAuthenticated = useCallback((name: string) => {
    setUsername(name);
    setAuthState('authed');
    navigate('overview');
  }, []);

  const renderView = (): ReactNode => {
    switch (view) {
      case 'overview': return <DashboardView onNavigate={navigate} />;
      case 'connection': return <ConnectionView />;
      case 'users': return <UsersView />;
      case 'groups': return <GroupsView />;
      case 'broadcast': return <BroadcastView />;
      case 'schedules': return <SchedulesView />;
      case 'quran': return <QuranView />;
      case 'ai': return <AiView />;
      case 'settings': return <SettingsView />;
      case 'logs': return <LogsView />;
      default: return <DashboardView onNavigate={navigate} />;
    }
  };

  /* ---------- states ---------- */
  if (authState === 'checking') {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ background: 'var(--color-paper)' }}
        role="status"
        aria-label="جارٍ التحقق من الجلسة"
      >
        <div
          className="animate-pulse"
          style={{
            width: 48,
            height: 48,
            borderRadius: 'var(--radius-full)',
            border: '3px solid var(--color-line)',
            borderTopColor: 'var(--color-primary)',
          }}
        />
      </div>
    );
  }

  if (authState === 'anonymous') {
    return <LoginView onAuthenticated={handleAuthenticated} />;
  }

  return (
    <AppShell view={view} username={username}>
      {renderView()}
    </AppShell>
  );
}
