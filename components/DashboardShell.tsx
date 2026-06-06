"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { identify, setProfile, setSuperProperties, track, reset } from "@/lib/mixpanel";
import {
  BookOpen,
  LayoutDashboard,
  LogOut,
  Zap,
  Clock,
  ChevronRight,
} from "lucide-react";
import clsx from "clsx";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  plan: string;
  minutes_remaining: number;
}

const NAV = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "My Notes", href: "/dashboard/notes", icon: BookOpen },
];

export default function DashboardShell({
  children,
  profile,
}: {
  children: React.ReactNode;
  profile: Profile | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [loggingOut, setLoggingOut] = useState(false);
  const supabase = createClient();

  // Re-identify on every app re-open (required per Mixpanel identity spec)
  useEffect(() => {
    if (profile) {
      identify(profile.id);
      setProfile({ email: profile.email, name: profile.full_name, plan: profile.plan });
      setSuperProperties({ platform: "web", plan_type: profile.plan });
    }
  }, [profile]);

  // Track page views
  useEffect(() => {
    track("page_viewed", { path: pathname });
  }, [pathname]);

  async function handleLogout() {
    setLoggingOut(true);
    track("logout_clicked");
    await supabase.auth.signOut();
    reset();
    router.push("/login");
    router.refresh();
  }

  const minutesPct = Math.min(
    100,
    Math.round(((profile?.minutes_remaining ?? 0) / 60) * 100)
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-gray-100">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900">Revise Wallah</span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                pathname === href
                  ? "bg-purple-50 text-purple-700"
                  : "text-gray-600 hover:bg-gray-100"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          ))}
        </nav>

        {/* Minutes remaining */}
        <div className="px-4 py-4 border-t border-gray-100">
          <div className="bg-gray-50 rounded-xl p-3 mb-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
                <Clock className="w-3.5 h-3.5" />
                Minutes left
              </div>
              <span className="text-xs font-bold text-purple-700">
                {profile?.minutes_remaining ?? 0}
              </span>
            </div>
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 rounded-full transition-all"
                style={{ width: `${minutesPct}%` }}
              />
            </div>
            <button
              onClick={() => {
                track("upgrade_clicked", { source: "sidebar_minutes" });
                router.push("/dashboard/upgrade");
              }}
              className="mt-2.5 w-full flex items-center justify-center gap-1 text-xs font-semibold text-purple-600 hover:text-purple-700"
            >
              Get more minutes <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {/* User */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 text-sm font-bold text-purple-700">
                {(profile?.full_name ?? profile?.email ?? "U")[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-900 truncate">
                  {profile?.full_name ?? "Student"}
                </p>
                <p className="text-[10px] text-gray-400 capitalize">{profile?.plan} plan</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
