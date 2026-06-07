"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, ArrowLeft, Tag, Zap, Crown } from "lucide-react";
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

// Card accent config per plan
const CARD_STYLE: Record<Plan, {
  border: string; badge?: string; badgeBg: string; badgeText: string;
  btnBg: string; btnText: string; headerText: string; checkColor: string;
}> = {
  free: {
    border: "border-gray-700",
    badgeBg: "", badgeText: "",
    btnBg: "bg-gray-700 hover:bg-gray-600",
    btnText: "text-gray-300",
    headerText: "text-gray-300",
    checkColor: "text-gray-500",
  },
  student: {
    border: "border-purple-500",
    badge: "Most Popular",
    badgeBg: "bg-purple-500",
    badgeText: "text-white",
    btnBg: "bg-purple-600 hover:bg-purple-500",
    btnText: "text-white",
    headerText: "text-purple-300",
    checkColor: "text-purple-400",
  },
  premium: {
    border: "border-violet-400",
    badge: "Best Value",
    badgeBg: "bg-violet-500",
    badgeText: "text-white",
    btnBg: "bg-violet-600 hover:bg-violet-500",
    btnText: "text-white",
    headerText: "text-violet-300",
    checkColor: "text-violet-400",
  },
  pro: {
    border: "border-amber-400",
    badge: "All Features",
    badgeBg: "bg-amber-400",
    badgeText: "text-gray-900",
    btnBg: "bg-amber-400 hover:bg-amber-300",
    btnText: "text-gray-900",
    headerText: "text-amber-300",
    checkColor: "text-amber-400",
  },
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
    // Full-screen dark overlay — popup feel inside the dashboard shell
    <div className="min-h-screen bg-gray-950 -m-8 px-4 py-10 flex flex-col items-center">

      {/* Back */}
      <div className="w-full max-w-6xl mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      </div>

      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-white mb-2">Upgrade your plan</h1>
        <p className="text-gray-400 text-sm">Monthly · cancel anytime · minutes reset each month</p>
      </div>

      {error && (
        <div className="w-full max-w-6xl mb-6 bg-red-950 border border-red-700 text-red-300 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {/* Plan cards */}
      <div className="w-full max-w-6xl grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
        {PLANS.map((plan) => {
          const style = CARD_STYLE[plan.id];
          const isCurrent = plan.id === currentPlan;
          const isDowngrade = planRank(plan.id) < planRank(currentPlan);
          const isLoading = loading === plan.id;
          const isPopular = plan.id === "student";

          return (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-2xl border-2 bg-gray-900 p-6 ${style.border} ${
                isPopular ? "shadow-lg shadow-purple-900/40" : ""
              }`}
            >
              {/* Badge */}
              {style.badge && (
                <div className={`absolute -top-3.5 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap ${style.badgeBg} ${style.badgeText}`}>
                  {isCurrent ? "Current plan" : style.badge}
                </div>
              )}
              {!style.badge && isCurrent && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap bg-gray-600 text-white">
                  Current plan
                </div>
              )}

              {/* Plan name */}
              <div className={`text-xs font-semibold uppercase tracking-widest mb-1 ${style.headerText}`}>
                {plan.label}
              </div>

              {/* Price */}
              <div className="mb-5">
                {plan.priceInr === 0 ? (
                  <p className="text-4xl font-bold text-white">Free</p>
                ) : (
                  <p className="text-4xl font-bold text-white">
                    ₹{plan.priceInr}
                    <span className="text-base font-normal text-gray-400">/mo</span>
                  </p>
                )}
                <p className={`text-xs font-semibold mt-1 flex items-center gap-1 ${style.headerText}`}>
                  {plan.id === "pro" ? (
                    <><Crown className="w-3 h-3" /> Unlimited minutes</>
                  ) : (
                    <><Zap className="w-3 h-3" /> {MINUTES_VALUE[plan.id]} / month</>
                  )}
                </p>
              </div>

              {/* CTA button */}
              {plan.priceInr === 0 ? (
                <div className={`w-full py-2.5 rounded-xl text-center text-sm font-semibold mb-6 bg-gray-800 text-gray-500 ${isCurrent ? "ring-1 ring-gray-600" : ""}`}>
                  {isCurrent ? "Current plan" : "Free forever"}
                </div>
              ) : (
                <button
                  onClick={() => handleUpgrade(plan)}
                  disabled={isCurrent || isDowngrade || !!loading}
                  className={`w-full py-2.5 rounded-xl text-sm font-semibold mb-6 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                    isCurrent || isDowngrade ? "bg-gray-800 text-gray-500" : `${style.btnBg} ${style.btnText}`
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
                        <Check className={`w-4 h-4 flex-shrink-0 ${style.checkColor}`} />
                        <span className="text-white font-semibold">{MINUTES_VALUE[plan.id]}</span>
                        <span className="text-gray-500 text-xs">video minutes</span>
                      </li>
                    );
                  }
                  const included = plan.features.includes(key as never);
                  return (
                    <li key={key} className={`flex items-center gap-2.5 text-sm ${included ? "text-gray-200" : "text-gray-600"}`}>
                      {included
                        ? <Check className={`w-4 h-4 flex-shrink-0 ${style.checkColor}`} />
                        : <X className="w-4 h-4 flex-shrink-0 text-gray-700" />
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
      <div className="w-full max-w-6xl mt-10">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 max-w-sm">
          <p className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-1.5">
            <Tag className="w-4 h-4 text-purple-400" />
            Have a promo code?
          </p>
          <form onSubmit={handlePromo} className="flex gap-2">
            <input
              type="text"
              value={promoCode}
              onChange={(e) => { setPromoCode(e.target.value.toUpperCase()); setPromoError(null); }}
              placeholder="ENTER CODE"
              className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm font-mono uppercase tracking-widest placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500"
            />
            <button
              type="submit"
              disabled={promoLoading || !promoCode.trim()}
              className="bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-40"
            >
              {promoLoading ? "…" : "Apply"}
            </button>
          </form>
          {promoError && <p className="mt-2 text-xs text-red-400">{promoError}</p>}
          {promoSuccess && <p className="mt-2 text-xs text-green-400 font-medium">{promoSuccess}</p>}
        </div>

        <p className="mt-6 text-xs text-gray-600">
          Payments processed by Razorpay · Minutes reset each month · Contact support@revisewallah.com
        </p>
      </div>
    </div>
  );
}
