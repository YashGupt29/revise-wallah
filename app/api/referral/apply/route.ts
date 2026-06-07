/**
 * POST /api/referral/apply
 *
 * Called during signup (or manually) to apply a referral code.
 * - Validates the code
 * - Records the referral
 * - Grants the referee 30 bonus minutes
 * - Grants the referrer 30 minutes per referral
 * - If referrer hits 3 referrals, upgrades them to Student plan for 30 days free
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const REFERRAL_BONUS_REFEREE = 30;  // new user gets 30 minutes
const REFERRAL_BONUS_REFERRER = 30; // referrer gets 30 minutes per friend
const REFERRAL_THRESHOLD = 3;       // at 3 referrals → free Student month

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const code: string = (body.code ?? "").trim().toUpperCase();
  if (!code) return NextResponse.json({ error: "No referral code provided" }, { status: 400 });

  const admin = createAdminClient();

  // Find referrer
  const { data: referrer } = await admin
    .from("users")
    .select("id, referral_code, referral_count, minutes_remaining, plan, plan_expires_at")
    .eq("referral_code", code)
    .single();

  if (!referrer) return NextResponse.json({ error: "Invalid referral code" }, { status: 404 });
  if (referrer.id === user.id) return NextResponse.json({ error: "Cannot use your own code" }, { status: 400 });

  // Prevent duplicate referral
  const { data: existing } = await admin
    .from("referrals")
    .select("id")
    .eq("referrer_id", referrer.id)
    .eq("referee_id", user.id)
    .maybeSingle();

  if (existing) return NextResponse.json({ error: "Referral already applied" }, { status: 409 });

  // ── Apply referral ─────────────────────────────────────────────────────────

  // 1. Grant referee bonus minutes
  const { data: referee } = await admin
    .from("users")
    .select("minutes_remaining")
    .eq("id", user.id)
    .single();

  const refereeNewBalance = (referee?.minutes_remaining ?? 0) + REFERRAL_BONUS_REFEREE;
  await admin
    .from("users")
    .update({ minutes_remaining: refereeNewBalance, referred_by: code })
    .eq("id", user.id);

  await admin.from("minutes_log").insert({
    user_id: user.id,
    delta: REFERRAL_BONUS_REFEREE,
    balance_after: refereeNewBalance,
    reason: "referral_bonus",
  });

  // 2. Grant referrer bonus minutes + increment count
  const newCount = (referrer.referral_count ?? 0) + 1;
  const referrerNewBalance = (referrer.minutes_remaining ?? 0) + REFERRAL_BONUS_REFERRER;

  const referrerUpdate: Record<string, unknown> = {
    minutes_remaining: referrerNewBalance,
    referral_count: newCount,
  };

  // 3. If referrer hits threshold and is on free plan → give Student plan for 30 days
  if (newCount >= REFERRAL_THRESHOLD && (referrer.plan === "free" || !referrer.plan)) {
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    referrerUpdate.plan = "student";
    referrerUpdate.plan_expires_at = expiresAt;
    // Reset minutes to Student plan allowance
    referrerUpdate.minutes_remaining = 500;
  }

  await admin.from("users").update(referrerUpdate).eq("id", referrer.id);

  await admin.from("minutes_log").insert({
    user_id: referrer.id,
    delta: REFERRAL_BONUS_REFERRER,
    balance_after: referrerNewBalance,
    reason: "referral_reward",
  });

  // 4. Record the referral
  await admin.from("referrals").insert({
    referrer_id: referrer.id,
    referee_id: user.id,
  });

  return NextResponse.json({
    success: true,
    minutes_added: REFERRAL_BONUS_REFEREE,
    minutes_remaining: refereeNewBalance,
  });
}
