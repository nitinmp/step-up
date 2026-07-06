"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { signIn, getSession } from "next-auth/react";
import { useState } from "react";

import { AuthCard } from "@/components/auth/auth-card";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/activities";

  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const result = await signIn("credentials", {
      mobile,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid mobile number or password.");
      return;
    }

    const session = await getSession();
    if (session?.user?.mustChangePassword) {
      router.push("/change-password");
    } else {
      router.push(callbackUrl);
    }
    router.refresh();
  }

  return (
    <AuthCard
      title="Log in"
      subtitle="Track your steps and climb the leaderboard."
      footer={null}
    >
      <form className="space-y-4" method="post" onSubmit={handleSubmit}>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-foreground">Mobile</span>
          <input
            autoComplete="tel"
            className="field-input"
            inputMode="numeric"
            name="mobile"
            onChange={(event) => setMobile(event.target.value)}
            placeholder="10-digit mobile number"
            required
            type="tel"
            value={mobile}
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-foreground">Password</span>
          <input
            autoComplete="current-password"
            className="field-input"
            name="password"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Your password"
            required
            type="password"
            value={password}
          />
        </label>

        {error ? (
          <p className="rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </p>
        ) : null}

        <button
          className="w-full rounded-2xl bg-brand px-4 py-3 text-base font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
          disabled={loading}
          type="submit"
        >
          {loading ? "Logging in…" : "Log in"}
        </button>
      </form>
    </AuthCard>
  );
}
