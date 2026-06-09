import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getCommunityStats } from "@/lib/community.functions";

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(n >= 10_000 ? 0 : 1) + "K";
  return n.toString();
}

export function Stats() {
  const fetchStats = useServerFn(getCommunityStats);
  const { data } = useQuery({
    queryKey: ["community-stats"],
    queryFn: () => fetchStats(),
    refetchInterval: 30_000,
  });

  const stats = [
    { value: formatNumber(data?.totalFounders ?? 0), label: "Founders Joined" },
    { value: formatNumber(data?.startupsShowcased ?? 0), label: "Startups Showcased" },
    { value: formatNumber(data?.activeStreaks ?? 0), label: "Active Streaks" },
    { value: formatNumber(data?.totalXp ?? 0), label: "XP Earned" },
  ];

  return (
    <section className="relative py-16 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="glass-strong rounded-3xl p-8 sm:p-12 ember-bg shadow-elegant">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="font-display text-3xl sm:text-4xl md:text-5xl font-bold gradient-text">{s.value}</div>
                <div className="mt-2 text-xs sm:text-sm text-muted-foreground uppercase tracking-wider">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
