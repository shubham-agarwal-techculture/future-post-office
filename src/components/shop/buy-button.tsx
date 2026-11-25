"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { mockCheckoutSignature } from "@/lib/payments/mock-signature";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
    };
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function BuyButton({
  productId,
  productName,
  owned,
}: {
  productId: string;
  productName: string;
  owned: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (owned) {
    return (
      <span className="text-sm font-medium text-sage" aria-label="Owned">
        In your desk drawer
      </span>
    );
  }

  async function verify(payload: {
    order_id: string;
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) {
    const res = await fetch("/api/payments/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Verification failed");
    router.push(`/shop/success?order=${payload.order_id}`);
    router.refresh();
  }

  async function buy() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: productId }),
      });
      const session = await res.json();
      if (!res.ok) throw new Error(session.error ?? "Checkout failed");

      if (session.mock) {
        // Local mock adapter — clearly not a real Razorpay payment
        const paymentId = `mock_pay_${Date.now()}`;
        const signature = mockCheckoutSignature(
          session.razorpay_order_id,
          paymentId,
        );
        await verify({
          order_id: session.order_id,
          razorpay_order_id: session.razorpay_order_id,
          razorpay_payment_id: paymentId,
          razorpay_signature: signature,
        });
        return;
      }

      const ok = await loadRazorpayScript();
      if (!ok || !window.Razorpay) {
        throw new Error("Could not load Razorpay Checkout");
      }
      if (!session.key_id) {
        throw new Error("Razorpay key is not configured on the server");
      }

      const rzp = new window.Razorpay({
        key: session.key_id,
        amount: session.amount_paise,
        currency: session.currency,
        name: "Future Post Office",
        description: productName,
        order_id: session.razorpay_order_id,
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            await verify({
              order_id: session.order_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
          } catch (err) {
            setError(err instanceof Error ? err.message : "Verify failed");
          }
        },
        theme: { color: "#c23b22" },
      });
      rzp.open();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button type="button" onClick={buy} disabled={loading}>
        {loading ? "Opening checkout…" : "Buy once"}
      </Button>
      {error ? (
        <p className="text-sm text-stamp-deep" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
