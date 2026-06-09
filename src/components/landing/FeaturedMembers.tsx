import { Zap, TrendingUp, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getTopMembers } from "@/lib/community.functions";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

type Profile = {
  id: string;
  display_name: string;
  handle: string | null;
  startup_name: string | null;
  avatar_url: string | null;
  xp: number;
  streak_days: number;
};

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";
}

function MemberCard({ m, rank, metric }: { m: Profile; rank: number; metric: "xp" | "streak" }) {
  return (
    <div className="glass rounded-2xl p-6 hover:bg-white/[0.06] hover:-translate-y-1 transition-all duration-500">
      <div className="flex items-start gap-4">
        <div className="relative shrink-0">
          {m.avatar_url ? (
            <img src={m.avatar_url} alt={m.display_name} className="h-14 w-14 rounded-full object-cover shadow-glow-sm" />
          ) : (
            <div className="h-14 w-14 rounded-full gradient-primary flex items-center justify-center font-display font-bold text-lg text-primary-foreground shadow-glow-sm">
              {initialsOf(m.display_name)}
            </div>
          )}
          <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-background border-2 border-background flex items-center justify-center">
            <span className="text-[10px] font-bold text-primary">#{rank}</span>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold truncate">{m.display_name || "Anonymous founder"}</div>
          <div className="text-xs text-muted-foreground truncate">{m.handle ? `@${m.handle}` : "—"}</div>
          {m.startup_name && <div className="mt-1 text-xs text-primary font-medium truncate">Building {m.startup_name}</div>}
        </div>
      </div>
      <div className="mt-5 pt-4 border-t border-border flex items-center justify-between text-xs">
        <span className={`flex items-center gap-1.5 ${metric === "xp" ? "text-primary font-semibold" : "text-muted-foreground"}`}>
          <TrendingUp className="h-3.5 w-3.5 text-primary" />
          {m.xp.toLocaleString()} XP
        </span>
        <span className={`flex items-center gap-1.5 ${metric === "streak" ? "text-primary font-semibold" : "text-muted-foreground"}`}>
          <Zap className="h-3.5 w-3.5 text-primary" />
          {m.streak_days} day streak
        </span>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="col-span-full glass rounded-2xl p-12 text-center">
      <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary shadow-glow mb-5">
        <Users className="h-6 w-6 text-primary-foreground" />
      </div>
      <h3 className="font-display text-xl font-bold mb-2">Be the first founder on the board.</h3>
      <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
        The leaderboard is live and updates in real time. Create an account to start earning XP and building your streak.
      </p>
      <Link to="/auth">
        <Button variant="hero" size="lg">Join the Forge</Button>
      </Link>
    </div>
  );
}

export function FeaturedMembers() {
  const fetchTop = useServerFn(getTopMembers);
  const { data, isLoading } = useQuery({
    queryKey: ["top-members"],
    queryFn: () => fetchTop(),
    refetchInterval: 30_000,
  });

  const topByXp = data?.topByXp ?? [];
  const topByStreak = data?.topByStreak ?? [];

  return (
    <section id="members" className="relative py-24 sm:py-32 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-20">
        {/* Top XP */}
        <div>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-12">
            <div>
              <div className="inline-flex items-center gap-2 glass rounded-full px-3 py-1 mb-4">
                <TrendingUp className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs text-primary font-medium uppercase tracking-wider">Top XP</span>
              </div>
              <h2 className="font-display text-4xl sm:text-5xl font-bold">
                The builders <span className="gradient-text">setting the pace.</span>
              </h2>
            </div>
            <p className="text-muted-foreground max-w-md">
              Live leaderboard — ranked by XP earned across the community.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {isLoading ? (
              <div className="col-span-full text-center text-sm text-muted-foreground py-12">Loading live leaderboard…</div>
            ) : topByXp.length === 0 ? (
              <EmptyState />
            ) : (
              topByXp.map((m, i) => <MemberCard key={m.id} m={m as Profile} rank={i + 1} metric="xp" />)
            )}
          </div>
        </div>

        {/* Top Streak */}
        {topByStreak.length > 0 && (
          <div>
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-12">
              <div>
                <div className="inline-flex items-center gap-2 glass rounded-full px-3 py-1 mb-4">
                  <Zap className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs text-primary font-medium uppercase tracking-wider">Longest Streaks</span>
                </div>
                <h2 className="font-display text-3xl sm:text-4xl font-bold">
                  Showing up <span className="gradient-text">every day.</span>
                </h2>
              </div>
              <p className="text-muted-foreground max-w-md">
                Founders with the longest active streaks in the forge.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {topByStreak.map((m, i) => (
                <MemberCard key={m.id} m={m as Profile} rank={i + 1} metric="streak" />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
