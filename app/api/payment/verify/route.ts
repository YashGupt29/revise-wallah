/**
 * POST /api/payment/verify
 *
 * Verifies Razorpay payment signature (HMAC-SHA256).
 * On success: adds minutes to user balance and logs the transaction.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createHmac } from "crypto";
import { PACKAGES } from "../order/route";
import { track } from "@/lib/mixpanel";

export async function POST(req: NextRequest) {
  // ── Auth ───────────────────────────────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // ── Parse body ─────────────────────────────────────────────────────────────
  const body = await req.json().catch(() => ({}));
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    packageId,
  } = body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !packageId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // ── Verify HMAC signature ──────────────────────────────────────────────────
  const secret = process.env.RAZORPAY_KEY_SECRET!;
  const expectedSig = createHmac("sha256", secret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (expectedSig !== razorpay_signature) {
    return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
  }

  // ── Validate package ───────────────────────────────────────────────────────
  const pkg = PACKAGES.find((p) => p.id === packageId);
  if (!pkg) {
    return NextResponse.json({ error: "Invalid package" }, { status: 400 });
  }

  // ── Add minutes to user (idempotent via payment_id check) ─────────────────
  const admin = createAdminClient();

  // Check for duplicate payment
  const { data: existing } = await admin
    .from("minutes_log")
    .select("id")
    .eq("payment_id", razorpay_payment_id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "Payment already applied" }, { status: 409 });
  }

  // Get current balance
  const { data: userRow } = await admin
    .from("users")
    .select("minutes_remaining")
    .eq("id", user.id)
    .single();

  const currentBalance = userRow?.minutes_remaining ?? 0;
  const newBalance = currentBalance + pkg.minutes;

  // Update balance
  await admin
    .from("users")
    .update({ minutes_remaining: newBalance })
    .eq("id", user.id);

  // Log the credit
  await admin.from("minutes_log").insert({
    user_id: user.id,
    delta: pkg.minutes,
    balance_after: newBalance,
    reason: "topup",
    payment_id: razorpay_payment_id,
    order_id: razorpay_order_id,
  });

  track("payment_completed", {
    package_id: packageId,
    minutes_added: pkg.minutes,
    amount_inr: pkg.priceInr,
    balance_after: newBalance,
  });

  return NextResponse.json({ success: true, minutes_remaining: newBalance });
}
