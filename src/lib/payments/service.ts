import { createAdminClient } from "@/lib/supabase/admin";
import { getPaymentProvider, isProduction } from "@/lib/env";
import type { PaymentAdapter } from "@/lib/payments/adapter";
import { MockPaymentAdapter } from "@/lib/payments/mock";
import { RazorpayAdapter } from "@/lib/payments/razorpay";
import type { CheckoutInput, VerifyPaymentInput } from "@/lib/payments/schemas";
import type { Order, Product } from "@/types/database";

export class PaymentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentError";
  }
}

export function getPaymentAdapter(): PaymentAdapter {
  const provider = getPaymentProvider();
  if (provider === "mock") {
    if (isProduction()) {
      throw new PaymentError("Mock payments are disabled in production");
    }
    return new MockPaymentAdapter();
  }
  return new RazorpayAdapter();
}

/** Server loads price from DB — never trust the browser. */
export async function createCheckoutSession(
  userId: string,
  input: CheckoutInput,
): Promise<{
  order: Order;
  providerOrderId: string;
  amountPaise: number;
  currency: string;
  keyId: string | null;
  provider: "razorpay" | "mock";
  product: Product;
}> {
  const admin = createAdminClient();
  const { data: product, error } = await admin
    .from("products")
    .select("*")
    .eq("id", input.product_id)
    .eq("active", true)
    .maybeSingle();

  if (error) throw error;
  if (!product) throw new PaymentError("Product not found");

  // Idempotent entitlement: already owns product
  const { data: existingEntitlement } = await admin
    .from("entitlements")
    .select("id")
    .eq("user_id", userId)
    .eq("product_id", product.id)
    .maybeSingle();

  if (existingEntitlement) {
    throw new PaymentError("You already own this product");
  }

  const amountPaise = product.price_paise as number;
  const currency = product.currency as string;
  const adapter = getPaymentAdapter();

  const { data: order, error: oErr } = await admin
    .from("orders")
    .insert({
      user_id: userId,
      product_id: product.id,
      amount_paise: amountPaise,
      currency,
      status: "pending",
      provider: adapter.name,
    })
    .select("*")
    .single();

  if (oErr) throw oErr;

  const providerOrder = await adapter.createOrder({
    internalOrderId: order.id as string,
    amountPaise,
    currency,
    receipt: order.id as string,
    notes: { product_id: product.id as string, user_id: userId },
  });

  // Verify provider amount matches our trusted amount
  if (
    providerOrder.amountPaise !== amountPaise ||
    providerOrder.currency !== currency
  ) {
    await admin
      .from("orders")
      .update({ status: "failed" })
      .eq("id", order.id);
    throw new PaymentError("Provider order amount mismatch");
  }

  const { data: updated, error: uErr } = await admin
    .from("orders")
    .update({ razorpay_order_id: providerOrder.providerOrderId })
    .eq("id", order.id)
    .select("*")
    .single();

  if (uErr) throw uErr;

  return {
    order: updated as Order,
    providerOrderId: providerOrder.providerOrderId,
    amountPaise,
    currency,
    keyId: adapter.getPublicKey(),
    provider: adapter.name,
    product: product as Product,
  };
}

/**
 * Verify Checkout callback signature, match order amount, grant entitlement.
 * Client success alone is never enough — this server check is required.
 */
export async function verifyAndFulfillCheckout(
  userId: string,
  input: VerifyPaymentInput,
): Promise<{ orderId: string; alreadyFulfilled: boolean }> {
  const admin = createAdminClient();
  const adapter = getPaymentAdapter();

  const { data: order, error } = await admin
    .from("orders")
    .select("*")
    .eq("id", input.order_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!order) throw new PaymentError("Order not found");

  if (order.status === "paid") {
    return { orderId: order.id as string, alreadyFulfilled: true };
  }

  if (order.razorpay_order_id !== input.razorpay_order_id) {
    throw new PaymentError("Order ID mismatch");
  }

  const valid = adapter.verifyCheckoutSignature({
    providerOrderId: input.razorpay_order_id,
    providerPaymentId: input.razorpay_payment_id,
    signature: input.razorpay_signature,
  });

  if (!valid) {
    throw new PaymentError("Invalid payment signature");
  }

  return fulfillPaidOrder({
    order: order as Order,
    providerPaymentId: input.razorpay_payment_id,
    signature: input.razorpay_signature,
    source: "checkout_verify",
  });
}

export async function fulfillPaidOrder(args: {
  order: Order;
  providerPaymentId: string;
  signature?: string | null;
  source: string;
  rawEvent?: unknown;
}): Promise<{ orderId: string; alreadyFulfilled: boolean }> {
  const admin = createAdminClient();
  const { order } = args;

  if (order.status === "paid") {
    return { orderId: order.id, alreadyFulfilled: true };
  }

  // Record payment (unique on razorpay_payment_id)
  const { error: pErr } = await admin.from("payments").upsert(
    {
      order_id: order.id,
      razorpay_payment_id: args.providerPaymentId,
      razorpay_signature: args.signature ?? null,
      amount_paise: order.amount_paise,
      currency: order.currency,
      status: "captured",
      raw_event: args.rawEvent ?? { source: args.source },
    },
    { onConflict: "razorpay_payment_id" },
  );
  if (pErr) throw pErr;

  const { data: paidOrder, error: oErr } = await admin
    .from("orders")
    .update({ status: "paid" })
    .eq("id", order.id)
    .neq("status", "paid")
    .select("*")
    .maybeSingle();

  if (oErr) throw oErr;

  // If another worker already marked paid, still ensure entitlement exists
  const { data: product } = await admin
    .from("products")
    .select("*")
    .eq("id", order.product_id)
    .single();

  if (!product) throw new PaymentError("Product missing for order");

  const { error: eErr } = await admin.from("entitlements").upsert(
    {
      user_id: order.user_id,
      product_id: order.product_id,
      order_id: order.id,
      kind: product.kind,
      theme_key: product.theme_key,
    },
    { onConflict: "user_id,product_id" },
  );
  if (eErr) throw eErr;

  return {
    orderId: order.id,
    alreadyFulfilled: !paidOrder,
  };
}

/**
 * Process Razorpay webhook idempotently using unique provider event IDs.
 */
export async function processRazorpayWebhook(
  rawBody: string,
  signatureHeader: string | null,
): Promise<{ ok: boolean; duplicate?: boolean; message: string }> {
  const adapter = getPaymentAdapter();
  if (adapter.name !== "razorpay" && adapter.name !== "mock") {
    return { ok: false, message: "Unsupported provider" };
  }

  if (
    !adapter.validateWebhookSignature({
      rawBody,
      signatureHeader,
    })
  ) {
    return { ok: false, message: "Invalid webhook signature" };
  }

  const payload = JSON.parse(rawBody) as {
    event?: string;
    payload?: {
      payment?: {
        entity?: {
          id?: string;
          order_id?: string;
          amount?: number;
          currency?: string;
          status?: string;
        };
      };
    };
  };

  const eventType = payload.event ?? "unknown";
  const paymentEntity = payload.payload?.payment?.entity;
  // Razorpay does not always send a stable event id; compose one.
  const eventId =
    (payload as { id?: string }).id ??
    `${eventType}:${paymentEntity?.id ?? "none"}:${paymentEntity?.order_id ?? "none"}`;

  const admin = createAdminClient();

  const { data: inserted, error: insertErr } = await admin
    .from("webhook_events")
    .insert({
      provider: adapter.name,
      event_id: eventId,
      event_type: eventType,
      payload,
    })
    .select("id")
    .maybeSingle();

  if (insertErr) {
    // Unique violation → duplicate / retry
    if (insertErr.code === "23505") {
      return { ok: true, duplicate: true, message: "Duplicate event ignored" };
    }
    throw insertErr;
  }

  if (
    eventType === "payment.captured" &&
    paymentEntity?.order_id &&
    paymentEntity?.id &&
    paymentEntity.status === "captured"
  ) {
    const { data: order } = await admin
      .from("orders")
      .select("*")
      .eq("razorpay_order_id", paymentEntity.order_id)
      .maybeSingle();

    if (!order) {
      await admin
        .from("webhook_events")
        .update({ processed_at: new Date().toISOString() })
        .eq("id", inserted!.id);
      return { ok: true, message: "Order not found for payment — ignored" };
    }

    // Match amount & currency against trusted order
    if (
      paymentEntity.amount !== order.amount_paise ||
      (paymentEntity.currency &&
        paymentEntity.currency.toUpperCase() !==
          (order.currency as string).toUpperCase())
    ) {
      await admin
        .from("orders")
        .update({ status: "failed" })
        .eq("id", order.id)
        .eq("status", "pending");
      await admin
        .from("webhook_events")
        .update({ processed_at: new Date().toISOString() })
        .eq("id", inserted!.id);
      return { ok: false, message: "Amount/currency mismatch" };
    }

    await fulfillPaidOrder({
      order: order as Order,
      providerPaymentId: paymentEntity.id,
      source: "webhook",
      rawEvent: payload,
    });
  }

  await admin
    .from("webhook_events")
    .update({ processed_at: new Date().toISOString() })
    .eq("id", inserted!.id);

  return { ok: true, message: `Processed ${eventType}` };
}
