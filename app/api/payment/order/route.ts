/**
 * POST /api/payment/order
 *
 * Creates a Razorpay order for a monthly plan purchase.
 * Free plan has no payment — this route only handles paid plans.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Razorpay from "razorpay";
import { PLANS, type Plan } from "@/lib/plan/features";

// Only paid plans go through checkout
export const PAID_PLANS = PLANS.filter((p) => p.priceInr > 0);

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const planId: Plan = body.planId;
  const plan = PAID_PLANS.find((p) => p.id === planId);

  if (!plan) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const order = await razorpay.orders.create({
    amount: plan.priceInr * 100,
    currency: "INR",
    receipt: `uid_${user.id.slice(0, 8)}_plan_${planId}`,
    notes: {
      user_id: user.id,
      plan_id: planId,
      minutes: String(plan.minutesPerMonth),
    },
  });

  return NextResponse.json({
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: process.env.RAZORPAY_KEY_ID,
    plan,
  });
}
