"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthShell } from "@/components/auth-shell";
import { Btn } from "@/components/buttons";
import { FieldLabel, TextInput } from "@/components/text-input";
import { ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell>
      <h1 className="mb-1.5 text-[26px] font-bold tracking-tight text-ink">Welcome back</h1>
      <p className="mb-8 text-[14px] text-muted">Sign in to your OilfieldHub workspace.</p>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <FieldLabel>Email</FieldLabel>
          <TextInput type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <FieldLabel>Password</FieldLabel>
          <TextInput type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <p className="rounded-xl bg-red-bg px-3.5 py-2.5 text-[13px] text-red-deep">{error}</p>}
        <Btn type="submit" disabled={busy} className="w-full py-2.5">
          {busy ? "Signing in…" : "Sign in"}
        </Btn>
      </form>

      <p className="mt-8 text-center text-[13.5px] text-muted">
        No account?{" "}
        <Link href="/register" className="font-semibold text-brand hover:text-brand-dark">
          Register your organization
        </Link>
      </p>
    </AuthShell>
  );
}
