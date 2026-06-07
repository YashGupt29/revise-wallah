/**
 * GET /api/referral/code
 *
 * Returns (or creates) the current user's referral code.
 * Also returns how many referrals they've made and the reward threshold.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { randomBytes } from "crypto";

const REFERRAL_REWARD_THRESHOLD = 3; // friends needed for free month
const REFERRAL_BONUS_MINUTES = 30;   // per referral (always)

function generateCode(userId: string): string {
  // 6-char alphanumeric, seeded from userId for determinism if needed
  return randomBytes(4).toString("hex").toUpperCase().slice(0, 6);
}

export async function GET(_req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  let { data: profile } = await admin
    .from("users")
    .select("referral_code, referral_count, minutes_remaining")
    .eq("id", user.id)
    .single();

  // Generate code if not set
  if (!profile?.referral_code) {
    const code = generateCode(user.id);
    await admin
      .from("users")
      .update({ referral_code: code })
      .eq("id", user.id);
    profile = { ...profile, referral_code: code } as typeof profile;
  }

  const referralLink = `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/signup?ref=${profile?.referral_code}`;

  return NextResponse.json({
    code: profile?.referral_code,
    referral_link: referralLink,
    referral_count: profile?.referral_count ?? 0,
    threshold: REFERRAL_REWARD_THRESHOLD,
    bonus_minutes_per_referral: REFERRAL_BONUS_MINUTES,
  });
}
