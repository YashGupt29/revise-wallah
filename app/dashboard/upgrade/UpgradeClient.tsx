"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Zap, Star, Crown, Sparkles } from "lucide-react";
import { track } from "@/lib/mixpanel";
import { PLANS, planRank, type Plan, type PlanConfig } from "@/lib/plan/features";

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open(): void };
  }
}

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

const PLAN_ICONS: Record<Plan, React.ReactNode> = {
  free: <Zap className="w-5 h-5 text-gray-400" />,
  student: <Star className="w-5 h-5 text-blue-500" />,
  premium: <Sparkles className="w-5 h-5 text-purple-500" />,
  pro: <Crown className="w-5 h-5 text-yellow-500" />,
};

const FEATURE_LABELS: Record<string, string> = {
  notes: "Structured notes",
  topic_summaries: "Topic-wise summaries",
  handwritten_notes: "Handwritten notes",
  quiz: "Quizzes",
  flashcards: "Flashcards",
  ai_chat: "AI Chat",
  mindmap: "Mind map",
  pdf_export: "PDF Export",
  short_notes: "Short notes (2-page)",
  google_docs_export: "Google Docs Export",
  ads_minutes: "Watch ads for extra minutes",
  referral_rewards: "Referral rewards",
};

const MINUTES_LABEL: Record<Plan, string> = {
  free: "60 min / month",
  student: "500 min / month",
  premium: "800 min / month",
  pro: "Unlimited",
};

export default function UpgradeClient({ currentPlan }: { currentPlan: Plan }) {
  const router = useRouter();
  const [loading, setLoading] = useState<Plan | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleUpgrade(plan: PlanConfig) {
    if (plan.priceInr === 0) return;
    setLoading(plan.id);
    setError(null);
    track("upgrade_clicked", { plan_id: plan.id, price_inr: plan.priceInr });

    const loaded = await loadRazorpay();
    if (!loaded) {
      setError("Could not load payment gateway. Please try again.");
      setLoading(null);
      return;
    }

    const orderRes = await fetch("/api/payment/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId: plan.id }),
    });

    if (!orderRes.ok) {
      const d = await orderRes.json().catch(() => ({}));
      setError(d.error ?? "Failed to create order.");
      setLoading(null);
      return;
    }

    const { orderId, amount, currency, keyId } = await orderRes.json();

    await new Promise<void>((resolve) => {
      const rz = new window.Razorpay({
        key: keyId,
        amount,
        currency,
        name: "Revise Wallah",
        description: `${MINUTES_LABEL[plan.id]} – ${plan.label} Plan`,
        order_id: orderId,
        theme: { color: "#7c3aed" },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          const verifyRes = await fetch("/api/payment/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              planId: plan.id,
            }),
          });

          if (verifyRes.ok) {
            router.push("/dashboard?payment=success");
            router.refresh();
          } else {
            const d = await verifyRes.json().catch(() => ({}));
            setError(d.error ?? "Payment verification failed. Contact support.");
          }
          resolve();
        },
        modal: { ondismiss: () => { setLoading(null); resolve(); } },
      });
      rz.open();
    });

    setLoading(null);
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Choose your plan</h1>
        <p className="text-sm text-gray-500 mt-1">
          Monthly plans · cancel anytime · minutes reset each month
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {PLANS.map((plan) => {
          const isCurrent = plan.id === currentPlan;
          const isDowngrade = planRank(plan.id) < planRank(currentPlan);
          const isPopular = plan.id === "student";
          const isLoading = loading === plan.id;

          return (
            <div
              key={plan.id}
              className={`relative bg-white rounded-2xl border-2 p-5 flex flex-col gap-4 ${
                isCurrent
                  ? "border-purple-500 shadow-md"
                  : isPopular
                  ? "border-blue-400"
                  : "border-gray-200"
              }`}
            >
              {isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
                  Current plan
                </div>
              )}
              {isPopular && !isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                  Popular
                </div>
              )}

              {/* Header */}
              <div className="flex items-center gap-2">
                {PLAN_ICONS[plan.id]}
                <span className="font-bold text-gray-900">{plan.label}</span>
              </div>

              {/* Price */}
              <div>
                {plan.priceInr === 0 ? (
                  <p className="text-3xl font-bold text-gray-900">Free</p>
                ) : (
                  <p className="text-3xl font-bold text-gray-900">
                    ₹{plan.priceInr}
                    <span className="text-sm font-normal text-gray-400">/mo</span>
                  </p>
                )}
                <p className="text-xs font-medium text-purple-600 mt-1">
                  {MINUTES_LABEL[plan.id]}
                </p>
              </div>

              {/* Features */}
              <ul className="space-y-1.5 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                    <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                    {FEATURE_LABELS[f] ?? f}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              {plan.priceInr === 0 ? (
                <div className="w-full py-2.5 rounded-xl text-center text-sm font-medium text-gray-400 bg-gray-50 border border-gray-200">
                  {isCurrent ? "Your current plan" : "Free forever"}
                </div>
              ) : (
                <button
                  onClick={() => handleUpgrade(plan)}
                  disabled={isCurrent || isDowngrade || !!loading}
                  className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    isCurrent || isDowngrade
                      ? "bg-gray-100 text-gray-400"
                      : plan.id === "student"
                      ? "bg-blue-500 hover:bg-blue-600 text-white"
                      : plan.id === "premium"
                      ? "bg-purple-600 hover:bg-purple-700 text-white"
                      : "bg-yellow-500 hover:bg-yellow-600 text-white"
                  }`}
                >
                  {isCurrent
                    ? "Active"
                    : isDowngrade
                    ? "Downgrade not available"
                    : isLoading
                    ? "Opening checkout..."
                    : `Upgrade to ${plan.label}`}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-8 text-xs text-gray-400 max-w-lg">
        Payments processed by Razorpay. Minutes reset on renewal date each month.
        Downgrades take effect at end of current billing period.
        Contact support@revisewallah.com for help.
      </p>
    </div>
  );
}
