import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <div className="mb-10 text-center">
        <h1 className="font-display text-3xl text-ink">Reset password</h1>
        <p className="mt-2 text-ink/60">
          We&apos;ll email a link if that address has a desk.
        </p>
      </div>
      <Suspense fallback={<p className="text-center text-ink/50">Loading…</p>}>
        <AuthForm mode="reset" />
      </Suspense>
    </div>
  );
}
