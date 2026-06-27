"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";

import { AuthCard, AuthFooterLink } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <AuthCard
      title="Log in"
      subtitle="Track your steps and climb the leaderboard."
      footer={
        <>
          New here? <AuthFooterLink href="/register">Create an account</AuthFooterLink>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="mobile">Mobile</Label>
          <Input
            autoComplete="tel"
            id="mobile"
            inputMode="numeric"
            name="mobile"
            onChange={(event) => setMobile(event.target.value)}
            placeholder="10-digit mobile number"
            required
            type="tel"
            value={mobile}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            autoComplete="current-password"
            id="password"
            name="password"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Your password"
            required
            type="password"
            value={password}
          />
        </div>

        {error ? (
          <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <Button className="w-full" disabled={loading} type="submit">
          {loading ? "Logging in…" : "Log in"}
        </Button>
      </form>
    </AuthCard>
  );
}
