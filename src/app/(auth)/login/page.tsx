import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <div className="mb-10 text-center">
        <h1 className="font-display text-3xl text-ink">Sign in to your desk</h1>
        <p className="mt-2 text-ink/60">Pick up where your letters left off.</p>
      </div>
      <Suspense fallback={<p className="text-center text-ink/50">Loading…</p>}>
        <AuthForm mode="login" />
      </Suspense>
    </div>
  );
}
