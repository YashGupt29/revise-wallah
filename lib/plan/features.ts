/**
 * Plan feature definitions — single source of truth.
 * Used by API routes (gating) and UI (showing what's included).
 */

export type Plan = "free" | "student" | "premium" | "pro";

export interface PlanConfig {
  id: Plan;
  label: string;
  priceInr: number;       // 0 for free
  minutesPerMonth: number; // 9999 = "unlimited"
  features: PlanFeature[];
}

export type PlanFeature =
  | "notes"
  | "handwritten_notes"
  | "topic_summaries"
  | "quiz"
  | "flashcards"
  | "ai_chat"
  | "mindmap"
  | "pdf_export"
  | "short_notes"
  | "google_docs_export"
  | "ads_minutes"
  | "referral_rewards";

export const PLANS: PlanConfig[] = [
  {
    id: "free",
    label: "Free",
    priceInr: 0,
    minutesPerMonth: 60,
    features: ["notes", "topic_summaries", "ads_minutes", "referral_rewards"],
  },
  {
    id: "student",
    label: "Student",
    priceInr: 99,
    minutesPerMonth: 500,
    features: ["notes", "topic_summaries", "handwritten_notes", "quiz", "flashcards", "ai_chat"],
  },
  {
    id: "premium",
    label: "Premium",
    priceInr: 149,
    minutesPerMonth: 800,
    features: ["notes", "topic_summaries", "handwritten_notes", "quiz", "ai_chat", "mindmap", "pdf_export", "google_docs_export"],
  },
  {
    id: "pro",
    label: "Pro",
    priceInr: 299,
    minutesPerMonth: 9999,
    features: ["notes", "topic_summaries", "handwritten_notes", "quiz", "flashcards", "mindmap", "short_notes", "pdf_export"],
  },
];

export const PLAN_MAP = Object.fromEntries(PLANS.map((p) => [p.id, p])) as Record<Plan, PlanConfig>;

/** Returns true if the given plan includes the feature. */
export function planHasFeature(plan: Plan | string | null | undefined, feature: PlanFeature): boolean {
  const p = PLAN_MAP[(plan ?? "free") as Plan] ?? PLAN_MAP.free;
  return p.features.includes(feature);
}

/** Plan hierarchy index — higher = more features. */
const PLAN_RANK: Record<Plan, number> = { free: 0, student: 1, premium: 2, pro: 3 };

export function planRank(plan: Plan | string | null | undefined): number {
  return PLAN_RANK[(plan ?? "free") as Plan] ?? 0;
}

/** Minimum plan required for each feature. */
export const FEATURE_MIN_PLAN: Record<PlanFeature, Plan> = {
  notes: "free",
  topic_summaries: "free",
  ads_minutes: "free",
  referral_rewards: "free",
  handwritten_notes: "student",
  quiz: "student",
  flashcards: "student",
  ai_chat: "student",
  mindmap: "premium",
  pdf_export: "premium",
  google_docs_export: "premium",
  short_notes: "pro",
};
