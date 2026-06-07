/**
 * POST /api/payment/verify
 *
 * Verifies Razorpay payment signature (HMAC-SHA256).
 * On success: sets user plan, resets minutes_remaining to plan allowance,
 * sets plan_expires_at = now + 30 days.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createHmac } from "crypto";
import { PLANS, type Plan } from "@/lib/plan/features";
import { track } from "@/lib/mixpanel";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId } = body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !planId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // ── Verify HMAC signature ──────────────────────────────────────────────────
  const secret = process.env.RAZORPAY_KEY_SECRET!;
  const expected = createHmac("sha256", secret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (expected !== razorpay_signature) {
    return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
  }

  // ── Validate plan ──────────────────────────────────────────────────────────
  const plan = PLANS.find((p) => p.id === (planId as Plan));
  if (!plan || plan.priceInr === 0) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Idempotency: reject duplicate payment_id
  const { data: existing } = await admin
    .from("minutes_log")
    .select("id")
    .eq("payment_id", razorpay_payment_id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "Payment already applied" }, { status: 409 });
  }

  // ── Activate plan ──────────────────────────────────────────────────────────
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const newMinutes = plan.minutesPerMonth;

  await admin
    .from("users")
    .update({
      plan: plan.id,
      plan_expires_at: expiresAt,
      minutes_remaining: newMinutes,
    })
    .eq("id", user.id);

  // Log the credit
  await admin.from("minutes_log").insert({
    user_id: user.id,
    delta: newMinutes,
    balance_after: newMinutes,
    reason: "topup",
    payment_id: razorpay_payment_id,
    order_id: razorpay_order_id,
  });

  track("payment_completed", {
    plan_id: plan.id,
    minutes_added: newMinutes,
    amount_inr: plan.priceInr,
    balance_after: newMinutes,
  });

  return NextResponse.json({ success: true, plan: plan.id, minutes_remaining: newMinutes });
}
