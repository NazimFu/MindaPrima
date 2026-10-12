import { API_PREFIX, CSRF_COOKIE, CSRF_HEADER } from '@minda/common';

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

function csrfToken(): string {
  const m = document.cookie.split('; ').find((c) => c.startsWith(`${CSRF_COOKIE}=`));
  return m ? decodeURIComponent(m.split('=')[1] ?? '') : '';
}

async function raw(path: string, method: string, body?: unknown): Promise<Response> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (method !== 'GET') headers[CSRF_HEADER] = csrfToken();
  return fetch(`${API_PREFIX}${path}`, { method, headers, credentials: 'same-origin', body: body === undefined ? undefined : JSON.stringify(body) });
}

let refreshing: Promise<boolean> | null = null;
function refreshSession(): Promise<boolean> {
  refreshing ??= raw('/auth/refresh', 'POST').then((r) => r.ok).catch(() => false).finally(() => { refreshing = null; });
  return refreshing;
}

/** JSON request to the backend. Refreshes the session once on 401 and sends the CSRF token on writes. */
export async function api<T = void>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const method = opts.method ?? 'GET';
  let res = await raw(path, method, opts.body);
  if (res.status === 401 && !path.startsWith('/auth/')) {
    if (await refreshSession()) res = await raw(path, method, opts.body);
  }
  if (res.status === 401 && !path.startsWith('/auth/login')) {
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') window.location.assign('/login');
  }
  if (!res.ok) {
    let message = 'Something went wrong';
    try { message = ((await res.json()) as { error?: string }).error ?? message; } catch { /* keep default */ }
    throw new ApiError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const post = <T = void>(path: string, body?: unknown) => api<T>(path, { method: 'POST', body: body ?? {} });
export const put = <T = void>(path: string, body: unknown) => api<T>(path, { method: 'PUT', body });
export const patch = <T = void>(path: string, body: unknown) => api<T>(path, { method: 'PATCH', body });
export const del = <T = void>(path: string) => api<T>(path, { method: 'DELETE' });
