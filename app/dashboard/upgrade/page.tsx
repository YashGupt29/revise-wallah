import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import UpgradeClient from "./UpgradeClient";
import { type Plan } from "@/lib/plan/features";

export default async function UpgradePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("plan")
    .eq("id", user.id)
    .single();

  return <UpgradeClient currentPlan={(profile?.plan ?? "free") as Plan} />;
}
