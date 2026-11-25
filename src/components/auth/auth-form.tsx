"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

type Mode = "login" | "signup" | "reset";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/inbox";
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "");
    const password = String(fd.get("password") ?? "");
    const displayName = String(fd.get("display_name") ?? "");
    const supabase = createClient();

    try {
      if (mode === "login") {
        const { error: err } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (err) {
          setError(err.message);
          return;
        }
        router.push(next);
        router.refresh();
        return;
      }

      if (mode === "signup") {
        const origin = window.location.origin;
        const { error: err } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName || undefined },
            emailRedirectTo: `${origin}/auth/callback?next=/inbox`,
          },
        });
        if (err) {
          setError(err.message);
          return;
        }
        setInfo("Check your email to confirm, or sign in if confirmations are disabled.");
        return;
      }

      const origin = window.location.origin;
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/auth/callback?next=/account`,
      });
      if (err) {
        setError(err.message);
        return;
      }
      setInfo("If that email exists, a reset link is on its way.");
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function google() {
    setError(null);
    const supabase = createClient();
    const origin = window.location.origin;
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (err) setError(err.message);
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-6">
      <form onSubmit={onSubmit} className="space-y-4">
        {mode === "signup" ? (
          <div>
            <Label htmlFor="display_name">Display name</Label>
            <Input id="display_name" name="display_name" autoComplete="nickname" />
          </div>
        ) : null}
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
          />
        </div>
        {mode !== "reset" ? (
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </div>
        ) : null}

        {error ? (
          <p className="text-sm text-stamp-deep" role="alert">
            {error}
          </p>
        ) : null}
        {info ? (
          <p className="text-sm text-sage" role="status">
            {info}
          </p>
        ) : null}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading
            ? "Please wait…"
            : mode === "login"
              ? "Sign in"
              : mode === "signup"
                ? "Create account"
                : "Send reset link"}
        </Button>
      </form>

      {mode !== "reset" ? (
        <>
          <div className="relative text-center text-xs uppercase tracking-widest text-ink/40">
            <span className="bg-parchment px-2">or</span>
            <div className="absolute inset-x-0 top-1/2 -z-10 border-t border-ink/10" />
          </div>
          <Button type="button" variant="ghost" className="w-full" onClick={google}>
            Continue with Google
          </Button>
        </>
      ) : null}

      <p className="text-center text-sm text-ink/60">
        {mode === "login" ? (
          <>
            New here? <Link href="/signup">Open a desk</Link>
            {" · "}
            <Link href="/reset-password">Reset password</Link>
          </>
        ) : mode === "signup" ? (
          <>
            Already have a desk? <Link href="/login">Sign in</Link>
          </>
        ) : (
          <>
            Remembered it? <Link href="/login">Sign in</Link>
          </>
        )}
      </p>
    </div>
  );
}
