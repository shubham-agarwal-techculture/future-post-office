/**
 * Deterministic mock checkout signature (local dev only).
 * Isomorphic — safe to import from client or server.
 * Never used as proof of a real Razorpay payment.
 */
export function mockCheckoutSignature(
  orderId: string,
  paymentId: string,
): string {
  const payload = `${orderId}|${paymentId}|mock`;
  // Simple stable hash (not cryptographic; mock adapter only)
  let hash = 2166136261;
  for (let i = 0; i < payload.length; i++) {
    hash ^= payload.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `mock_${(hash >>> 0).toString(16)}_${payload.length}`;
}

export function mockWebhookSignature(rawBody: string): string {
  const payload = `mock_webhook_secret:${rawBody}`;
  let hash = 2166136261;
  for (let i = 0; i < payload.length; i++) {
    hash ^= payload.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `mockwh_${(hash >>> 0).toString(16)}`;
}
