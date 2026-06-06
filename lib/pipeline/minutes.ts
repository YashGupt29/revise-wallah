/**
 * MinutesService — responsible for checking and deducting user minute balance.
 *
 * Single responsibility: all minute balance logic lives here.
 * Never calls Modal or touches video data.
 */

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export class InsufficientMinutesError extends Error {
  constructor(public required: number, public available: number) {
    super(`Insufficient minutes: need ${required}, have ${available}`);
    this.name = "InsufficientMinutesError";
  }
}

/** Check balance without deducting. Throws if insufficient. */
export async function assertSufficientMinutes(
  userId: string,
  required: number
): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("users")
    .select("minutes_remaining")
    .eq("id", userId)
    .single();

  const balance = data?.minutes_remaining ?? 0;
  if (balance < required) throw new InsufficientMinutesError(required, balance);
  return balance;
}

/**
 * Deduct minutes and write a log entry.
 * Uses admin client to bypass RLS since this is a server action.
 */
export async function deductMinutes(
  userId: string,
  amount: number,
  reason: "processed" | "cache_hit" | "export" | "ai_chat",
  processedVideoId?: string
): Promise<number> {
  const admin = createAdminClient();

  const { data: user } = await admin
    .from("users")
    .select("minutes_remaining")
    .eq("id", userId)
    .single();

  const newBalance = Math.max(0, (user?.minutes_remaining ?? 0) - amount);

  await admin
    .from("users")
    .update({
      minutes_remaining: newBalance,
      total_minutes_used: admin.rpc("increment", { x: amount }), // handled below
    })
    .eq("id", userId);

  // Simpler: just update both fields directly
  const currentUsed = await admin
    .from("users")
    .select("total_minutes_used")
    .eq("id", userId)
    .single();

  await admin
    .from("users")
    .update({
      minutes_remaining: newBalance,
      total_minutes_used: (currentUsed.data?.total_minutes_used ?? 0) + amount,
    })
    .eq("id", userId);

  await admin.from("minutes_log").insert({
    user_id: userId,
    delta: -amount,
    balance_after: newBalance,
    reason,
    processed_video_id: processedVideoId ?? null,
  });

  return newBalance;
}
