/**
 * POST /api/payment/order
 *
 * Creates a Razorpay order for a minutes package.
 * Returns { orderId, amount, currency, keyId } to the client.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Razorpay from "razorpay";

// Minutes packages available for purchase
export const PACKAGES = [
  { id: "starter", label: "Starter", minutes: 100, priceInr: 99 },
  { id: "popular", label: "Popular", minutes: 300, priceInr: 249 },
  { id: "pro", label: "Pro", minutes: 1000, priceInr: 699 },
] as const;

type PackageId = (typeof PACKAGES)[number]["id"];

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(req: NextRequest) {
  // ── Auth ───────────────────────────────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // ── Input validation ───────────────────────────────────────────────────────
  const body = await req.json().catch(() => ({}));
  const packageId: PackageId = body.packageId;
  const pkg = PACKAGES.find((p) => p.id === packageId);

  if (!pkg) {
    return NextResponse.json({ error: "Invalid package" }, { status: 400 });
  }

  // ── Create Razorpay order ──────────────────────────────────────────────────
  const order = await razorpay.orders.create({
    amount: pkg.priceInr * 100, // Razorpay expects paise (1 INR = 100 paise)
    currency: "INR",
    receipt: `uid_${user.id.slice(0, 8)}_pkg_${packageId}`,
    notes: {
      user_id: user.id,
      package_id: packageId,
      minutes: String(pkg.minutes),
    },
  });

  return NextResponse.json({
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: process.env.RAZORPAY_KEY_ID,
    package: pkg,
  });
}
