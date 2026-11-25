import { NextResponse } from "next/server";
import {
  AuthError,
  badRequest,
  requireUser,
  tooManyRequests,
  unauthorized,
} from "@/lib/auth/session";
import { rateLimit } from "@/lib/auth/rate-limit";
import { verifyPaymentSchema } from "@/lib/payments/schemas";
import {
  PaymentError,
  verifyAndFulfillCheckout,
} from "@/lib/payments/service";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const rl = rateLimit(`pay-verify:${user.id}`, 20, 60_000);
    if (!rl.allowed) return tooManyRequests();

    const json = await request.json();
    const parsed = verifyPaymentSchema.safeParse(json);
    if (!parsed.success) {
      return badRequest("Invalid verification payload", parsed.error.flatten());
    }

    const result = await verifyAndFulfillCheckout(user.id, parsed.data);
    return NextResponse.json({
      ok: true,
      order_id: result.orderId,
      already_fulfilled: result.alreadyFulfilled,
    });
  } catch (e) {
    if (e instanceof AuthError) return unauthorized();
    if (e instanceof PaymentError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("POST /api/payments/verify", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
