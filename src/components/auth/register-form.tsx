"use client";

import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";

import { AuthCard, AuthFooterLink } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, mobile, password, confirmPassword }),
    });

    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setLoading(false);
      setError(payload.error ?? "Registration failed.");
      return;
    }

    const signInResult = await signIn("credentials", {
      mobile,
      password,
      redirect: false,
    });

    setLoading(false);

    if (signInResult?.error) {
      setError("Account created, but sign-in failed. Try logging in.");
      router.push("/login");
      return;
    }

    router.push("/activities");
    router.refresh();
  }

  return (
    <AuthCard
      title="Create account"
      subtitle="Join the 29-day steps challenge."
      footer={
        <>
          Already registered?{" "}
          <AuthFooterLink href="/login">Log in</AuthFooterLink>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            autoComplete="name"
            id="name"
            name="name"
            onChange={(event) => setName(event.target.value)}
            placeholder="Your name"
            required
            type="text"
            value={name}
          />
        </div>

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
            autoComplete="new-password"
            id="password"
            minLength={8}
            name="password"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 8 characters"
            required
            type="password"
            value={password}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input
            autoComplete="new-password"
            id="confirmPassword"
            minLength={8}
            name="confirmPassword"
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Repeat password"
            required
            type="password"
            value={confirmPassword}
          />
        </div>

        {error ? (
          <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <Button className="w-full" disabled={loading} type="submit">
          {loading ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </AuthCard>
  );
}
