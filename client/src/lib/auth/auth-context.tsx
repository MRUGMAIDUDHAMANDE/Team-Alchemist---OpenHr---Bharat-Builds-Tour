"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { authApi, getValidAccessToken } from "@/lib/api/client";
import {
  clearSessionMarker,
  clearTokens,
  markSessionActive,
  saveTokens,
  tokensFromResponse,
} from "./storage";
import type { AuthStatus, AuthTokens, AuthUser, LoginInput, SignupInput } from "./types";

interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  isAuthenticated: boolean;
  signIn: (input: LoginInput) => Promise<AuthUser>;
  signUp: (input: SignupInput) => Promise<{ email: string; message: string }>;
  confirmEmail: (input: { email: string; code: string }) => Promise<void>;
  resendCode: (email: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  resetPassword: (input: {
    email: string;
    code: string;
    newPassword: string;
  }) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<AuthUser | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function persistSession(tokens: AuthTokens) {
  saveTokens(tokensFromResponse(tokens));
  markSessionActive();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  /**
   * Resolve the current session by validating the stored access token against
   * the API. If there is no usable token this settles to "unauthenticated".
   */
  const refreshUser = useCallback(async (): Promise<AuthUser | null> => {
    const token = await getValidAccessToken();
    if (!token) {
      setUser(null);
      setStatus("unauthenticated");
      return null;
    }

    try {
      const { user: profile } = await authApi.me();
      setUser(profile);
      setStatus("authenticated");
      return profile;
    } catch {
      clearTokens();
      clearSessionMarker();
      setUser(null);
      setStatus("unauthenticated");
      return null;
    }
  }, []);

  useEffect(() => {
    // One-time bootstrap: reconcile stored tokens with the API on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshUser();
  }, [refreshUser]);

  const signIn = useCallback(async (input: LoginInput) => {
    const { user: profile, tokens } = await authApi.login(input);
    persistSession(tokens);
    setUser(profile);
    setStatus("authenticated");
    return profile;
  }, []);

  const signUp = useCallback(async (input: SignupInput) => {
    const result = await authApi.signup(input);
    return { email: result.email, message: result.message };
  }, []);

  const confirmEmail = useCallback(async (input: { email: string; code: string }) => {
    await authApi.confirmSignup(input);
  }, []);

  const resendCode = useCallback(async (email: string) => {
    await authApi.resendCode(email);
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    await authApi.forgotPassword(email);
  }, []);

  const resetPassword = useCallback(
    async (input: { email: string; code: string; newPassword: string }) => {
      await authApi.resetPassword(input);
    },
    [],
  );

  const signOut = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Sign-out must succeed locally even if the network call fails.
    } finally {
      clearTokens();
      clearSessionMarker();
      setUser(null);
      setStatus("unauthenticated");
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      isAuthenticated: status === "authenticated",
      signIn,
      signUp,
      confirmEmail,
      resendCode,
      requestPasswordReset,
      resetPassword,
      signOut,
      refreshUser,
    }),
    [
      user,
      status,
      signIn,
      signUp,
      confirmEmail,
      resendCode,
      requestPasswordReset,
      resetPassword,
      signOut,
      refreshUser,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
