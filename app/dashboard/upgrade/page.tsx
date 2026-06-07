"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Zap, Check } from "lucide-react";
import { track } from "@/lib/mixpanel";

interface Package {
  id: string;
  label: string;
  minutes: number;
  priceInr: number;
}

const PACKAGES: Package[] = [
  { id: "starter", label: "Starter", minutes: 100, priceInr: 99 },
  { id: "popular", label: "Popular", minutes: 300, priceInr: 249 },
  { id: "pro", label: "Pro", minutes: 1000, priceInr: 699 },
];

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open(): void };
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

export default function UpgradePage() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleBuy(pkg: Package) {
    setLoading(pkg.id);
    setError(null);
    track("upgrade_clicked", { package_id: pkg.id, price_inr: pkg.priceInr });

    // 1. Load Razorpay SDK
    const loaded = await loadRazorpayScript();
    if (!loaded) {
      setError("Could not load payment gateway. Please try again.");
      setLoading(null);
      return;
    }

    // 2. Create order on our server
    const orderRes = await fetch("/api/payment/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packageId: pkg.id }),
    });
    if (!orderRes.ok) {
      const data = await orderRes.json().catch(() => ({}));
      setError(data.error ?? "Failed to create order. Please try again.");
      setLoading(null);
      return;
    }
    const { orderId, amount, currency, keyId } = await orderRes.json();

    // 3. Open Razorpay checkout
    await new Promise<void>((resolve) => {
      const rz = new window.Razorpay({
        key: keyId,
        amount,
        currency,
        name: "Revise Wallah",
        description: `${pkg.minutes} minutes – ${pkg.label} pack`,
        order_id: orderId,
        theme: { color: "#7c3aed" },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          // 4. Verify payment
          const verifyRes = await fetch("/api/payment/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              packageId: pkg.id,
            }),
          });
          if (verifyRes.ok) {
            router.push("/dashboard?payment=success");
            router.refresh();
          } else {
            const data = await verifyRes.json().catch(() => ({}));
            setError(data.error ?? "Payment verification failed. Contact support.");
          }
          resolve();
        },
        modal: {
          ondismiss: () => {
            setLoading(null);
            resolve();
          },
        },
      });
      rz.open();
    });

    setLoading(null);
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Get More Minutes</h1>
        <p className="text-sm text-gray-500 mt-1">
          One-time top-up — no subscriptions, no expiry.
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl">
        {PACKAGES.map((pkg) => {
          const isPopular = pkg.id === "popular";
          const isLoading = loading === pkg.id;
          return (
            <div
              key={pkg.id}
              className={`relative bg-white rounded-2xl border-2 p-6 flex flex-col gap-4 ${
                isPopular ? "border-purple-500 shadow-md" : "border-gray-200"
              }`}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                  Most Popular
                </div>
              )}

              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  {pkg.label}
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  ₹{pkg.priceInr}
                </p>
              </div>

              <div className="flex items-center gap-2 text-purple-700 font-semibold">
                <Zap className="w-4 h-4 fill-purple-600" />
                {pkg.minutes} minutes
              </div>

              <ul className="space-y-1.5 text-sm text-gray-600 flex-1">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                  ~{Math.floor(pkg.minutes / 5)} videos (avg. 25 min each)
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                  Never expires
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                  Notes, flashcards & quiz
                </li>
              </ul>

              <button
                onClick={() => handleBuy(pkg)}
                disabled={!!loading}
                className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-colors disabled:opacity-60 ${
                  isPopular
                    ? "bg-purple-600 hover:bg-purple-700 text-white"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-800"
                }`}
              >
                {isLoading ? "Opening checkout..." : `Buy for ₹${pkg.priceInr}`}
              </button>
            </div>
          );
        })}
      </div>

      <p className="mt-8 text-xs text-gray-400 max-w-md">
        Payments are processed securely by Razorpay. We do not store your card details.
        For support, contact us at support@revisewallah.com.
      </p>
    </div>
  );
}
