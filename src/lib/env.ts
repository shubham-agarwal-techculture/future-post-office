import { z } from "zod";

const serverSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  NEXT_PUBLIC_RAZORPAY_KEY_ID: z.string().optional(),
  PAYMENT_PROVIDER: z.enum(["razorpay", "mock"]).default("razorpay"),
  CRON_SECRET: z.string().min(16).optional(),
  APP_URL: z.string().url().optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).optional(),
});

export type ServerEnv = z.infer<typeof serverSchema>;

let cached: ServerEnv | null = null;

/** Parse server env. Public keys may be missing in unit tests — callers should handle. */
export function getServerEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    // Soft-fail for build/test; runtime routes check required secrets explicitly.
    cached = {
      NEXT_PUBLIC_SUPABASE_URL:
        process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321",
      NEXT_PUBLIC_SUPABASE_ANON_KEY:
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "test-anon-key",
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
      RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
      RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET,
      NEXT_PUBLIC_RAZORPAY_KEY_ID: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      PAYMENT_PROVIDER:
        (process.env.PAYMENT_PROVIDER as "razorpay" | "mock") ?? "razorpay",
      CRON_SECRET: process.env.CRON_SECRET,
      APP_URL: process.env.APP_URL,
      NODE_ENV: process.env.NODE_ENV as ServerEnv["NODE_ENV"],
    };
    return cached;
  }
  cached = parsed.data;
  return cached;
}

export function assertServiceRole(): string {
  const key = getServerEnv().SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  }
  return key;
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export function getPaymentProvider(): "razorpay" | "mock" {
  const provider = getServerEnv().PAYMENT_PROVIDER ?? "razorpay";
  if (provider === "mock" && isProduction()) {
    throw new Error("Mock payment provider is disabled in production");
  }
  return provider;
}
