import { NextResponse } from "next/server";
import {
  AuthError,
  badRequest,
  requireUser,
  tooManyRequests,
  unauthorized,
} from "@/lib/auth/session";
import { rateLimit } from "@/lib/auth/rate-limit";
import { checkoutSchema } from "@/lib/payments/schemas";
import {
  createCheckoutSession,
  PaymentError,
} from "@/lib/payments/service";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const rl = rateLimit(`checkout:${user.id}`, 10, 60_000);
    if (!rl.allowed) return tooManyRequests();

    const json = await request.json();
    const parsed = checkoutSchema.safeParse(json);
    if (!parsed.success) {
      return badRequest("Invalid checkout", parsed.error.flatten());
    }

    const session = await createCheckoutSession(user.id, parsed.data);
    return NextResponse.json({
      order_id: session.order.id,
      razorpay_order_id: session.providerOrderId,
      amount_paise: session.amountPaise,
      currency: session.currency,
      key_id: session.keyId,
      provider: session.provider,
      product: {
        id: session.product.id,
        name: session.product.name,
      },
      // Explicit label when mock — never claim real Razorpay payment
      mock: session.provider === "mock",
    });
  } catch (e) {
    if (e instanceof AuthError) return unauthorized();
    if (e instanceof PaymentError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("POST /api/checkout", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
