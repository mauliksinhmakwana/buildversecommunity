import { createServerFn } from "@tanstack/react-start";

export const getCommunityStats = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const [{ count: totalFounders }, { count: withStartup }, { count: withStreak }, xpAgg] = await Promise.all([
    supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }).not("startup_name", "is", null),
    supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }).gt("streak_days", 0),
    supabaseAdmin.from("profiles").select("xp"),
  ]);

  const totalXp = (xpAgg.data ?? []).reduce((s, r) => s + (r.xp ?? 0), 0);

  return {
    totalFounders: totalFounders ?? 0,
    startupsShowcased: withStartup ?? 0,
    activeStreaks: withStreak ?? 0,
    totalXp,
  };
});

export const getTopMembers = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const [byXp, byStreak] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select("id, display_name, handle, startup_name, avatar_url, xp, streak_days")
      .order("xp", { ascending: false })
      .order("streak_days", { ascending: false })
      .limit(6),
    supabaseAdmin
      .from("profiles")
      .select("id, display_name, handle, startup_name, avatar_url, xp, streak_days")
      .order("streak_days", { ascending: false })
      .order("xp", { ascending: false })
      .limit(6),
  ]);

  return {
    topByXp: byXp.data ?? [],
    topByStreak: byStreak.data ?? [],
  };
});
