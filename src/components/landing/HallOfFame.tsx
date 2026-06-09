import { Crown, Award, Star, Trophy } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { getTopMembers } from "@/lib/community.functions";
import { Button } from "@/components/ui/button";

const ICONS = [Crown, Award, Star];

export function HallOfFame() {
  const fetchTop = useServerFn(getTopMembers);
  const { data, isLoading } = useQuery({
    queryKey: ["top-members"],
    queryFn: () => fetchTop(),
    refetchInterval: 60_000,
  });

  const legends = (data?.topByXp ?? []).slice(0, 3);

  return (
    <section id="hall" className="relative py-24 sm:py-32 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 glass rounded-full px-3 py-1 mb-4">
            <Crown className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs text-primary font-medium uppercase tracking-wider">Hall of Fame</span>
          </div>
          <h2 className="font-display text-4xl sm:text-5xl font-bold">
            Community <span className="gradient-text">Legends.</span>
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            The top three founders shaping the forge right now.
          </p>
        </div>

        {isLoading ? (
          <div className="text-center text-sm text-muted-foreground py-12">Loading legends…</div>
        ) : legends.length === 0 ? (
          <div className="glass-strong rounded-3xl p-12 text-center max-w-2xl mx-auto">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl gradient-primary shadow-glow mb-5">
              <Trophy className="h-7 w-7 text-primary-foreground" />
            </div>
            <h3 className="font-display text-2xl font-bold mb-2">The first three legends will be crowned soon.</h3>
            <p className="text-muted-foreground mb-6">
              Join the forge, earn XP, and your name could appear here.
            </p>
            <Link to="/auth">
              <Button variant="hero" size="lg">Claim your spot</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {legends.map((l, i) => {
              const Icon = ICONS[i] ?? Star;
              return (
                <div
                  key={l.id}
                  className="relative glass-strong rounded-3xl p-8 text-center overflow-hidden group hover:-translate-y-2 transition-all duration-500"
                >
                  <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-primary/20 blur-3xl group-hover:bg-primary/30 transition-all duration-500" />
                  <div className="relative">
                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl gradient-primary shadow-glow mb-5 animate-pulse-glow">
                      <Icon className="h-7 w-7 text-primary-foreground" />
                    </div>
                    <div className="text-xs text-primary font-semibold uppercase tracking-widest mb-2">
                      Legend #{i + 1}
                    </div>
                    <h3 className="font-display text-2xl font-bold mb-2">{l.display_name || "Anonymous founder"}</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {l.startup_name ? `Building ${l.startup_name}` : `${l.streak_days} day streak`}
                    </p>
                    <div className="inline-flex items-center gap-2 glass rounded-full px-3 py-1">
                      <span className="text-xs text-muted-foreground">XP</span>
                      <span className="text-sm font-bold gradient-text">{l.xp.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
