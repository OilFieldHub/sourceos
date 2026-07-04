"use client";

import { api } from "./api-client";
import { useAuth } from "./auth-context";

export function useAuthedApi() {
  const { session } = useAuth();
  const token = session?.accessToken ?? null;
  return {
    get: <T,>(path: string) => api.get<T>(path, token),
    post: <T,>(path: string, body?: unknown) => api.post<T>(path, body, token),
    patch: <T,>(path: string, body?: unknown) => api.patch<T>(path, body, token),
  };
}
