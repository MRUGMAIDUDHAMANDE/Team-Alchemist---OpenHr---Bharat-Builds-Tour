import type { AuthTokens } from "./types";

/**
 * Client-side token persistence.
 *
 * Chosen deliberately: the API issues Cognito tokens to the browser (see the
 * server-proxied auth decision), so the access token lives in memory-backed
 * localStorage for page reloads, and a short refresh token lets us mint new
 * access tokens without another login.
 *
 * A lightweight non-sensitive cookie is also set so Next.js Proxy can do an
 * optimistic route redirect. It carries no authority — every protected API
 * call is still verified server-side against Cognito's JWKS.
 */

const TOKEN_KEY = "openhr.tokens";
export const SESSION_COOKIE = "openhr_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export interface StoredTokens extends AuthTokens {
  /** Epoch millis at which the access token should be considered expired. */
  expiresAt: number;
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function loadTokens(): StoredTokens | null {
  if (!isBrowser()) return null;

  try {
    const raw = window.localStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredTokens;
    if (!parsed.accessToken || !parsed.expiresAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveTokens(tokens: StoredTokens): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
}

export function clearTokens(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(TOKEN_KEY);
}

export function tokensFromResponse(tokens: AuthTokens): StoredTokens {
  return {
    ...tokens,
    expiresAt: Date.now() + tokens.expiresIn * 1000,
  };
}

export function markSessionActive(): void {
  if (!isBrowser()) return;
  document.cookie = `${SESSION_COOKIE}=1; path=/; max-age=${SESSION_MAX_AGE_SECONDS}; samesite=lax`;
}

export function clearSessionMarker(): void {
  if (!isBrowser()) return;
  document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0; samesite=lax`;
}
