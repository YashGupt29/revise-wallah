"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Tag, Zap, Crown } from "lucide-react";
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

// All features shown in the comparison, in display order
const ALL_FEATURES: { key: string; label: string }[] = [
  { key: "minutes",           label: "Video minutes / month" },
  { key: "notes",             label: "Structured notes" },
  { key: "topic_summaries",   label: "Topic-wise summaries" },
  { key: "handwritten_notes", label: "Handwritten notes" },
  { key: "quiz",              label: "Quizzes" },
  { key: "flashcards",        label: "Flashcards" },
  { key: "ai_chat",           label: "AI Chat" },
  { key: "mindmap",           label: "Mind Map" },
  { key: "pdf_export",        label: "PDF Export" },
  { key: "short_notes",       label: "Short Notes (2-page)" },
  { key: "ads_minutes",       label: "Watch ads for extra minutes" },
  { key: "referral_rewards",  label: "Referral rewards" },
];

const MINUTES_VALUE: Record<Plan, string> = {
  free: "60 min",
  student: "500 min",
  premium: "800 min",
  pro: "Unlimited",
};

// Card config — all purple, only elevation/badge varies
const CARD_STYLE: Record<Plan, {
  border: string;
  badge?: string;
  glow: boolean;
  btnBg: string;
}> = {
  free:    { border: "border-gray-700",    badge: undefined,       glow: false, btnBg: "bg-gray-700 hover:bg-gray-600 text-gray-300" },
  student: { border: "border-purple-500",  badge: "Most Popular",  glow: true,  btnBg: "bg-purple-600 hover:bg-purple-500 text-white" },
  premium: { border: "border-purple-400",  badge: "Best Value",    glow: false, btnBg: "bg-purple-600 hover:bg-purple-500 text-white" },
  pro:     { border: "border-purple-300",  badge: "All Features",  glow: false, btnBg: "bg-purple-600 hover:bg-purple-500 text-white" },
};

export default function UpgradeClient({ currentPlan }: { currentPlan: Plan }) {
  const router = useRouter();
  const [loading, setLoading] = useState<Plan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoSuccess, setPromoSuccess] = useState<string | null>(null);

  async function handlePromo(e: React.FormEvent) {
    e.preventDefault();
    if (!promoCode.trim()) return;
    setPromoLoading(true);
    setPromoError(null);
    setPromoSuccess(null);
    const res = await fetch("/api/payment/promo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: promoCode.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setPromoSuccess("Pro plan activated for 30 days!");
      track("promo_redeemed", { plan: data.plan });
      setTimeout(() => { router.push("/dashboard?payment=success"); router.refresh(); }, 1500);
    } else {
      setPromoError(data.error ?? "Invalid code.");
    }
    setPromoLoading(false);
  }

  async function handleUpgrade(plan: PlanConfig) {
    if (plan.priceInr === 0) return;
    setLoading(plan.id);
    setError(null);
    track("upgrade_clicked", { plan_id: plan.id, price_inr: plan.priceInr });

    const loaded = await loadRazorpay();
    if (!loaded) { setError("Could not load payment gateway."); setLoading(null); return; }

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
        key: keyId, amount, currency,
        name: "Revise Wallah",
        description: `${plan.label} Plan — ${MINUTES_VALUE[plan.id]}/month`,
        order_id: orderId,
        theme: { color: "#7c3aed" },
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          const verifyRes = await fetch("/api/payment/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...response, planId: plan.id }),
          });
          if (verifyRes.ok) { router.push("/dashboard?payment=success"); router.refresh(); }
          else {
            const d = await verifyRes.json().catch(() => ({}));
            setError(d.error ?? "Verification failed. Contact support.");
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
    <div className="pb-10">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Choose your plan</h1>
        <p className="text-sm text-gray-500 mt-1">Monthly · cancel anytime · minutes reset each month</p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {/* Plan cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 items-start">
        {PLANS.map((plan) => {
          const style = CARD_STYLE[plan.id];
          const isCurrent = plan.id === currentPlan;
          const isDowngrade = planRank(plan.id) < planRank(currentPlan);
          const isLoading = loading === plan.id;

          return (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-2xl border-2 bg-white p-6 ${style.border} ${
                style.glow ? "shadow-xl shadow-purple-100" : "shadow-sm"
              }`}
            >
              {/* Badge */}
              {(style.badge || isCurrent) && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap bg-purple-600 text-white">
                  {isCurrent ? "Current plan" : style.badge}
                </div>
              )}

              {/* Plan name */}
              <div className="text-xs font-semibold uppercase tracking-widest text-purple-600 mb-1">
                {plan.label}
              </div>

              {/* Price */}
              <div className="mb-5">
                {plan.priceInr === 0 ? (
                  <p className="text-4xl font-bold text-gray-900">Free</p>
                ) : (
                  <p className="text-4xl font-bold text-gray-900">
                    ₹{plan.priceInr}
                    <span className="text-base font-normal text-gray-400">/mo</span>
                  </p>
                )}
                <p className="text-xs font-semibold mt-1 text-purple-500 flex items-center gap-1">
                  {plan.id === "pro"
                    ? <><Crown className="w-3 h-3" /> Unlimited minutes</>
                    : <><Zap className="w-3 h-3" /> {MINUTES_VALUE[plan.id]} / month</>
                  }
                </p>
              </div>

              {/* CTA button */}
              {plan.priceInr === 0 ? (
                <div className={`w-full py-2.5 rounded-xl text-center text-sm font-semibold mb-6 bg-gray-100 text-gray-400 ${isCurrent ? "ring-1 ring-gray-300" : ""}`}>
                  {isCurrent ? "Current plan" : "Free forever"}
                </div>
              ) : (
                <button
                  onClick={() => handleUpgrade(plan)}
                  disabled={isCurrent || isDowngrade || !!loading}
                  className={`w-full py-2.5 rounded-xl text-sm font-semibold mb-6 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                    isCurrent || isDowngrade ? "bg-gray-100 text-gray-400" : style.btnBg
                  }`}
                >
                  {isCurrent ? "Active" : isDowngrade ? "—" : isLoading ? "Opening…" : `Get ${plan.label}`}
                </button>
              )}

              {/* Feature list */}
              <ul className="space-y-2.5">
                {ALL_FEATURES.map(({ key, label }) => {
                  if (key === "minutes") {
                    return (
                      <li key={key} className="flex items-center gap-2.5 text-sm">
                        <Check className="w-4 h-4 flex-shrink-0 text-purple-500" />
                        <span className="text-gray-900 font-semibold">{MINUTES_VALUE[plan.id]}</span>
                        <span className="text-gray-400 text-xs">video minutes</span>
                      </li>
                    );
                  }
                  const included = plan.features.includes(key as never);
                  return (
                    <li key={key} className={`flex items-center gap-2.5 text-sm ${included ? "text-gray-700" : "text-gray-300"}`}>
                      {included
                        ? <Check className="w-4 h-4 flex-shrink-0 text-purple-500" />
                        : <X className="w-4 h-4 flex-shrink-0 text-gray-300" />
                      }
                      <span>{label}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Promo code */}
      <div className="mt-10 max-w-sm">
        <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
          <Tag className="w-4 h-4 text-purple-500" />
          Have a promo code?
        </p>
        <form onSubmit={handlePromo} className="flex gap-2">
          <input
            type="text"
            value={promoCode}
            onChange={(e) => { setPromoCode(e.target.value.toUpperCase()); setPromoError(null); }}
            placeholder="ENTER CODE"
            className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm font-mono uppercase tracking-widest placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
          />
          <button
            type="submit"
            disabled={promoLoading || !promoCode.trim()}
            className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-40"
          >
            {promoLoading ? "…" : "Apply"}
          </button>
        </form>
        {promoError && <p className="mt-2 text-xs text-red-500">{promoError}</p>}
        {promoSuccess && <p className="mt-2 text-xs text-green-600 font-medium">{promoSuccess}</p>}
      </div>

      <p className="mt-8 text-xs text-gray-400">
        Payments processed by Razorpay · Minutes reset each month · Contact support@revisewallah.com
      </p>
    </div>
  );
}
