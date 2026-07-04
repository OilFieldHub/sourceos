"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "./api-client";
import type { AuthOrganization, AuthResult, AuthSupplier, AuthUser } from "./types";

const STORAGE_KEY = "oilfieldhub.session";

interface Session {
  accessToken: string;
  user: AuthUser;
  organization: AuthOrganization;
  supplier?: AuthSupplier;
}

interface RegisterInput {
  organizationName: string;
  organizationType: "BUYER" | "SUPPLIER";
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        setSession(JSON.parse(raw));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setLoading(false);
  }, []);

  const persist = useCallback((result: AuthResult) => {
    const next: Session = {
      accessToken: result.accessToken,
      user: result.user,
      organization: result.organization,
      supplier: result.supplier,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setSession(next);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await api.post<AuthResult>("/auth/login", { email, password });
      persist(result);
    },
    [persist],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      const result = await api.post<AuthResult>("/auth/register", input);
      persist(result);
    },
    [persist],
  );

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setSession(null);
  }, []);

  return (
    <AuthContext.Provider value={{ session, loading, login, register, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
