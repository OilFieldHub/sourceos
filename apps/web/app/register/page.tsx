"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthShell } from "@/components/auth-shell";
import { Btn } from "@/components/buttons";
import { FieldLabel, TextInput } from "@/components/text-input";
import { ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import type { OrganizationType } from "@/lib/types";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [organizationName, setOrganizationName] = useState("");
  const [organizationType, setOrganizationType] = useState<OrganizationType>("BUYER");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await register({
        organizationName,
        organizationType: organizationType as "BUYER" | "SUPPLIER",
        firstName,
        lastName,
        email,
        password,
      });
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell>
      <h1 className="mb-1.5 text-[26px] font-bold tracking-tight text-ink">Register your organization</h1>
      <p className="mb-8 text-[14px] text-muted">Set up your buyer or supplier workspace on OilfieldHub.</p>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => setOrganizationType("BUYER")}
            className={`rounded-xl border px-3.5 py-2.5 text-[13.5px] font-semibold transition ${
              organizationType === "BUYER"
                ? "border-brand bg-mint text-brand-dark"
                : "border-hairline bg-panel text-muted hover:border-brand/30"
            }`}
          >
            Buyer
          </button>
          <button
            type="button"
            onClick={() => setOrganizationType("SUPPLIER")}
            className={`rounded-xl border px-3.5 py-2.5 text-[13.5px] font-semibold transition ${
              organizationType === "SUPPLIER"
                ? "border-brand bg-mint text-brand-dark"
                : "border-hairline bg-panel text-muted hover:border-brand/30"
            }`}
          >
            Supplier
          </button>
        </div>

        <div>
          <FieldLabel>Organization name</FieldLabel>
          <TextInput required value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>First name</FieldLabel>
            <TextInput required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div>
            <FieldLabel>Last name</FieldLabel>
            <TextInput required value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
        </div>

        <div>
          <FieldLabel>Email</FieldLabel>
          <TextInput type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <FieldLabel>Password</FieldLabel>
          <TextInput
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <p className="rounded-xl bg-red-bg px-3.5 py-2.5 text-[13px] text-red-deep">{error}</p>}
        <Btn type="submit" disabled={busy} className="w-full py-2.5">
          {busy ? "Creating…" : "Create account"}
        </Btn>
      </form>

      <p className="mt-8 text-center text-[13.5px] text-muted">
        Already registered?{" "}
        <Link href="/login" className="font-semibold text-brand hover:text-brand-dark">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
