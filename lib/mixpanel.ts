import mixpanel from "mixpanel-browser";

let initialized = false;

export function initMixpanel() {
  if (initialized || typeof window === "undefined") return;
  mixpanel.init(process.env.NEXT_PUBLIC_MIXPANEL_TOKEN!, {
    debug: process.env.NODE_ENV !== "production",
    track_pageview: false, // we track manually per page
    persistence: "localStorage",
  });
  initialized = true;
}

// ─── Core tracking ────────────────────────────────────────────────────────────

export function track(event: string, properties?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  mixpanel.track(event, properties);
}

// ─── Identity — call in this order on signup/login ────────────────────────────
// 1. identify(userId)
// 2. setProfile(...)
// 3. setSuperProperties(...)
// 4. track("sign_up_completed" / "login_completed")

export function identify(userId: string) {
  if (typeof window === "undefined") return;
  mixpanel.identify(userId);
}

export function setProfile(traits: {
  email: string;
  name?: string | null;
  plan?: string;
  createdAt?: string;
}) {
  if (typeof window === "undefined") return;
  mixpanel.people.set({
    $email: traits.email,
    $name: traits.name ?? traits.email,
    $created: traits.createdAt ?? new Date().toISOString(),
    plan_type: traits.plan ?? "free",
  });
  mixpanel.people.set_once({
    first_sign_up_date: new Date().toISOString(),
  });
}

export function setSuperProperties(props: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  mixpanel.register(props);
}

export function reset() {
  if (typeof window === "undefined") return;
  mixpanel.reset();
}
