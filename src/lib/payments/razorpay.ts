import crypto from "crypto";
import Razorpay from "razorpay";
import type {
  CheckoutVerificationInput,
  CreateProviderOrderInput,
  PaymentAdapter,
  ProviderOrder,
  WebhookValidationInput,
} from "@/lib/payments/adapter";
import { getServerEnv } from "@/lib/env";

function getRazorpayClient() {
  const env = getServerEnv();
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    throw new Error(
      "Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET from the Razorpay Dashboard (Test mode).",
    );
  }
  return new Razorpay({
    key_id: env.RAZORPAY_KEY_ID,
    key_secret: env.RAZORPAY_KEY_SECRET,
  });
}

export function verifyRazorpayCheckoutSignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string,
): boolean {
  const payload = `${orderId}|${paymentId}`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function verifyRazorpayWebhookSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string,
): boolean {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export class RazorpayAdapter implements PaymentAdapter {
  readonly name = "razorpay" as const;

  async createOrder(input: CreateProviderOrderInput): Promise<ProviderOrder> {
    const client = getRazorpayClient();
    const order = await client.orders.create({
      amount: input.amountPaise,
      currency: input.currency,
      receipt: input.receipt.slice(0, 40),
      notes: {
        internal_order_id: input.internalOrderId,
        ...input.notes,
      },
    });

    return {
      providerOrderId: order.id,
      amountPaise: Number(order.amount),
      currency: order.currency,
      status: order.status,
    };
  }

  verifyCheckoutSignature(input: CheckoutVerificationInput): boolean {
    const secret = getServerEnv().RAZORPAY_KEY_SECRET;
    if (!secret) return false;
    return verifyRazorpayCheckoutSignature(
      input.providerOrderId,
      input.providerPaymentId,
      input.signature,
      secret,
    );
  }

  validateWebhookSignature(input: WebhookValidationInput): boolean {
    const secret = getServerEnv().RAZORPAY_WEBHOOK_SECRET;
    if (!secret || !input.signatureHeader) return false;
    return verifyRazorpayWebhookSignature(
      input.rawBody,
      input.signatureHeader,
      secret,
    );
  }

  getPublicKey(): string | null {
    return (
      getServerEnv().NEXT_PUBLIC_RAZORPAY_KEY_ID ??
      getServerEnv().RAZORPAY_KEY_ID ??
      null
    );
  }
}
