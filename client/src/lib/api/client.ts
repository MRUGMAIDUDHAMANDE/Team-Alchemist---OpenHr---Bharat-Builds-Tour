import {
  clearSessionMarker,
  clearTokens,
  loadTokens,
  markSessionActive,
  saveTokens,
  tokensFromResponse,
  type StoredTokens,
} from "@/lib/auth/storage";
import type { AuthTokens, AuthUser, LoginResponse } from "@/lib/auth/types";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:4000";

interface ApiEnvelope<T> {
  data?: T;
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * Single-flight refresh: if several requests get a 401 at once they share one
 * refresh call instead of stampeding Cognito.
 */
let refreshInFlight: Promise<StoredTokens | null> | null = null;

async function performRefresh(): Promise<StoredTokens | null> {
  const current = loadTokens();
  if (!current?.refreshToken) return null;

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: current.refreshToken }),
    });

    if (!response.ok) {
      clearTokens();
      clearSessionMarker();
      return null;
    }

    const payload = (await response.json()) as ApiEnvelope<{ tokens: AuthTokens }>;
    const tokens = payload.data?.tokens;
    if (!tokens?.accessToken) {
      clearTokens();
      clearSessionMarker();
      return null;
    }

    // Cognito's refresh flow does not always return a new refresh token.
    const merged = tokensFromResponse({
      ...tokens,
      refreshToken: tokens.refreshToken ?? current.refreshToken,
    });
    saveTokens(merged);
    return merged;
  } catch {
    return null;
  }
}

export async function getValidAccessToken(): Promise<string | null> {
  const tokens = loadTokens();
  if (!tokens) return null;

  // Refresh a little before actual expiry to avoid a race with in-flight calls.
  if (tokens.expiresAt - 30_000 > Date.now()) {
    return tokens.accessToken;
  }

  if (!refreshInFlight) {
    refreshInFlight = performRefresh().finally(() => {
      refreshInFlight = null;
    });
  }

  const refreshed = await refreshInFlight;
  return refreshed?.accessToken ?? null;
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  auth?: boolean;
  signal?: AbortSignal;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (options.auth) {
    const token = await getValidAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
      cache: "no-store",
    });
  } catch {
    throw new ApiError(
      0,
      "NETWORK_ERROR",
      "Cannot reach the server. Check your connection and try again.",
    );
  }

  const payload = (await response.json().catch(() => ({}))) as ApiEnvelope<T>;

  if (!response.ok) {
    if (response.status === 401 && options.auth) {
      clearTokens();
      clearSessionMarker();
    }
    throw new ApiError(
      response.status,
      payload.error?.code ?? "INTERNAL_ERROR",
      payload.error?.message ?? "Something went wrong.",
      payload.error?.details,
    );
  }

  return payload.data as T;
}

/** Auth endpoints, mirroring the server's /auth router. */
export const authApi = {
  signup(input: { name: string; email: string; password: string }) {
    return apiRequest<{ userId: string; email: string; requiresConfirmation: boolean; message: string }>(
      "/auth/signup",
      { method: "POST", body: input },
    );
  },

  confirmSignup(input: { email: string; code: string }) {
    return apiRequest<{ email: string; message: string }>("/auth/confirm", {
      method: "POST",
      body: input,
    });
  },

  resendCode(email: string) {
    return apiRequest<{ email: string; message: string }>("/auth/resend-code", {
      method: "POST",
      body: { email },
    });
  },

  login(input: { email: string; password: string }) {
    return apiRequest<LoginResponse>("/auth/login", {
      method: "POST",
      body: input,
    });
  },

  logout() {
    return apiRequest<{ message: string }>("/auth/logout", {
      method: "POST",
      auth: true,
    });
  },

  me() {
    return apiRequest<{ user: AuthUser }>("/auth/me", { auth: true });
  },

  forgotPassword(email: string) {
    return apiRequest<{ email: string; message: string }>("/auth/forgot-password", {
      method: "POST",
      body: { email },
    });
  },

  resetPassword(input: { email: string; code: string; newPassword: string }) {
    return apiRequest<{ email: string; message: string }>("/auth/reset-password", {
      method: "POST",
      body: input,
    });
  },
};

export { markSessionActive, clearSessionMarker };
