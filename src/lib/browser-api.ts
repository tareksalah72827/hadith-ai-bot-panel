'use client';

/**
 * Browser-side API client for the panel's own routes (relative paths only).
 * All server routes answer with JSON — never throws on HTTP errors, returns
 * a discriminated object instead.
 */
import type { ApiResponse, MeResponse } from './types';

async function request<T>(path: string, init?: RequestInit): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(path, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
      credentials: 'same-origin',
    });
    const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    if (!data) return { ok: false, error: 'رد غير صالح من الخادم' };
    if (data.ok === false) return { ok: false, error: String(data.error ?? 'خطأ غير معروف') };
    return { ...(data as unknown as T), ok: true } as ApiResponse<T>;
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'فشل الاتصال بالخادم' };
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: body === undefined ? undefined : JSON.stringify(body) }),
  login: (username: string, password: string) => request<never>('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  logout: () => request<never>('/api/auth/logout', { method: 'POST' }),
  me: () => request<MeResponse>('/api/auth/me'),
};

export function errMessage<T>(r: ApiResponse<T>): string {
  return r.ok ? '' : r.error;
}
