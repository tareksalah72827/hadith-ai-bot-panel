'use client';

/**
 * Shared polling hooks for panel views. Every view reads bot resources through
 * these hooks so behaviour (refresh cadence, demo detection, error states) is
 * uniform across the app. Views must render fine in demo mode.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/browser-api';
import type { ApiResponse } from '@/lib/types';

export interface Resource<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  demo: boolean;
  refresh: () => void;
}

interface Snapshot<T> {
  path: string;
  data: T | null;
  error: string | null;
  demo: boolean;
}

/**
 * Poll a GET panel route at an interval; detects the `demo: true` flag.
 * `loading` is derived from the snapshot (no sync setState inside effects).
 */
export function useBotResource<T>(path: string | null, pollMs = 15000): Resource<T> {
  const [snapshot, setSnapshot] = useState<Snapshot<T> | null>(null);
  const loadSeq = useRef(0);

  const load = useCallback(async () => {
    if (path === null) return;
    const seq = ++loadSeq.current;
    const r = await api.get<T>(path);
    if (seq !== loadSeq.current) return; // stale response — ignore
    if (r.ok) {
      const isDemo = (r as unknown as Record<string, unknown>).demo === true;
      setSnapshot({ path, data: r as unknown as T, error: null, demo: isDemo });
    } else {
      setSnapshot({ path, data: null, error: r.error, demo: false });
    }
  }, [path]);

  useEffect(() => {
    if (path === null) return;
    // first fetch fires from a timer callback (external system) — never sync
    const kick = window.setTimeout(() => { void load(); }, 0);
    const id = window.setInterval(() => { void load(); }, pollMs);
    return () => {
      window.clearTimeout(kick);
      window.clearInterval(id);
    };
  }, [path, pollMs, load]);

  const live = snapshot !== null && snapshot.path === path ? snapshot : null;
  const loading = path !== null && live === null;

  return {
    data: live ? live.data : null,
    error: live ? live.error : null,
    loading,
    demo: live ? live.demo : false,
    refresh: () => { void load(); },
  };
}

/** One-shot mutation helper with busy + error state. */
export function useBotMutation<T>() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<T | null>(null);

  const run = useCallback(
    async (fn: () => Promise<ApiResponse<T>>): Promise<ApiResponse<T>> => {
      setBusy(true);
      setError(null);
      const r = await fn();
      if (r.ok) {
        setResult((r as unknown as T));
      } else {
        setError(r.error);
      }
      setBusy(false);
      return r;
    },
    [],
  );

  return { busy, error, result, run, reset: () => { setError(null); setResult(null); } };
}

/** Formats seconds → "٣ س ١٢ د" style Arabic uptime. */
export function formatUptime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '—';
  const days = Math.floor(sec / 86400);
  const hours = Math.floor((sec % 86400) / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const parts: string[] = [];
  if (days > 0) parts.push(`${days} ي`);
  if (hours > 0) parts.push(`${hours} س`);
  parts.push(`${minutes} د`);
  return parts.join(' ');
}
