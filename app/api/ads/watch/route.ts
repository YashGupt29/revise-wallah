/**
 * POST /api/ads/watch
 *
 * Called after user watches an ad. Grants +10 minutes.
 * Rate-limited: free-plan users can watch at most 5 ads per day.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const AD_REWARD_MINUTES = 10;
const MAX_ADS_PER_DAY = 5;

export async function POST(_req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  // Only free plan users can earn via ads
  const { data: profile } = await admin
    .from("users")
    .select("plan, minutes_remaining")
    .eq("id", user.id)
    .single();

  if (profile?.plan && profile.plan !== "free") {
    return NextResponse.json(
      { error: "Ad rewards are only available on the free plan." },
      { status: 403 }
    );
  }

  // Rate limit: count watches today
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { count } = await admin
    .from("ad_watches")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("watched_at", todayStart.toISOString());

  if ((count ?? 0) >= MAX_ADS_PER_DAY) {
    return NextResponse.json(
      { error: "Daily limit reached. Come back tomorrow for more free minutes.", code: "daily_limit" },
      { status: 429 }
    );
  }

  // Grant minutes
  const currentBalance = profile?.minutes_remaining ?? 0;
  const newBalance = currentBalance + AD_REWARD_MINUTES;

  await admin
    .from("users")
    .update({ minutes_remaining: newBalance })
    .eq("id", user.id);

  await admin.from("ad_watches").insert({ user_id: user.id });

  await admin.from("minutes_log").insert({
    user_id: user.id,
    delta: AD_REWARD_MINUTES,
    balance_after: newBalance,
    reason: "ad_watch",
  });

  return NextResponse.json({
    success: true,
    minutes_added: AD_REWARD_MINUTES,
    minutes_remaining: newBalance,
    watches_today: (count ?? 0) + 1,
    watches_remaining_today: MAX_ADS_PER_DAY - (count ?? 0) - 1,
  });
}
