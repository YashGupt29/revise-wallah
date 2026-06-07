/**
 * POST /api/payment/promo
 *
 * Validates a promo code and grants the associated plan.
 * Each user can redeem a promo code only once.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PLAN_MAP } from "@/lib/plan/features";

// Promo codes → plan granted + duration in days
const PROMO_CODES: Record<string, { plan: keyof typeof PLAN_MAP; days: number }> = {
  REVISE: { plan: "pro", days: 30 },
};

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const code: string = (body.code ?? "").trim().toUpperCase();

  const promo = PROMO_CODES[code];
  if (!promo) {
    return NextResponse.json({ error: "Invalid promo code." }, { status: 400 });
  }

  const admin = createAdminClient();

  // One redemption per user
  const { count } = await admin
    .from("minutes_log")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("reason", "promo");

  if ((count ?? 0) > 0) {
    return NextResponse.json({ error: "You've already redeemed a promo code." }, { status: 409 });
  }

  const plan = PLAN_MAP[promo.plan];
  const expiresAt = new Date(Date.now() + promo.days * 24 * 60 * 60 * 1000).toISOString();

  await admin
    .from("users")
    .update({ plan: plan.id, plan_expires_at: expiresAt, minutes_remaining: plan.minutesPerMonth })
    .eq("id", user.id);

  await admin.from("minutes_log").insert({
    user_id: user.id,
    delta: plan.minutesPerMonth,
    balance_after: plan.minutesPerMonth,
    reason: "promo",
  });

  return NextResponse.json({
    success: true,
    plan: plan.id,
    minutes_remaining: plan.minutesPerMonth,
    expires_at: expiresAt,
  });
}
