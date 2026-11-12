/**
 * Central API helper – resolves the correct backend base URL.
 *
 * In development (Vite dev server), relative paths work fine because
 * Vite proxies /api/* to the local Express server on port 3000.
 *
 * In production (frontend on Vercel, backend on Render) set the
 * VITE_API_BASE_URL environment variable in your Vercel project to the
 * Render service URL, e.g.:
 *   VITE_API_BASE_URL=https://kna-steth-day-backend.onrender.com
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? '';

/**
 * Drop-in replacement for `fetch` that automatically prepends the
 * backend base URL to any path that starts with `/api`.
 *
 * Usage (no changes needed in components – just import this):
 *   import { apiFetch } from '@/lib/api';
 *   const res = await apiFetch('/api/settings');
 */
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (typeof input === 'string' && input.startsWith('/api')) {
    input = `${API_BASE_URL}${input}`;
  }
  return fetch(input, init);
}

export { API_BASE_URL };
