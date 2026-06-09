import { Flame, TrendingUp } from "lucide-react";

const members = [
  { name: "Ava Chen", handle: "@avabuilds", startup: "Loom for Sales", xp: 12480, streak: 87, initials: "AC" },
  { name: "Marcus Okafor", handle: "@marcusforge", startup: "Nimbus AI", xp: 10930, streak: 64, initials: "MO" },
  { name: "Priya Raman", handle: "@priyaships", startup: "Quanta Health", xp: 9870, streak: 121, initials: "PR" },
  { name: "Diego Alvarez", handle: "@diegobuilds", startup: "Flint Cloud", xp: 9210, streak: 42, initials: "DA" },
  { name: "Sara Lindqvist", handle: "@saracreates", startup: "Northwind", xp: 8740, streak: 58, initials: "SL" },
  { name: "Kenji Watanabe", handle: "@kenjiships", startup: "Tatami DB", xp: 8120, streak: 33, initials: "KW" },
];

export function FeaturedMembers() {
  return (
    <section id="members" className="relative py-24 sm:py-32 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-12">
          <div>
            <div className="inline-flex items-center gap-2 glass rounded-full px-3 py-1 mb-4">
              <span className="text-xs text-primary font-medium uppercase tracking-wider">Featured Members</span>
            </div>
            <h2 className="font-display text-4xl sm:text-5xl font-bold">
              The builders <span className="gradient-text">setting the pace.</span>
            </h2>
          </div>
          <p className="text-muted-foreground max-w-md">
            Top contributors this month — ranked by XP, streaks, and community impact.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {members.map((m, i) => (
            <div
              key={m.handle}
              className="glass rounded-2xl p-6 hover:bg-white/[0.06] hover:-translate-y-1 transition-all duration-500"
            >
              <div className="flex items-start gap-4">
                <div className="relative shrink-0">
                  <div className="h-14 w-14 rounded-full gradient-primary flex items-center justify-center font-display font-bold text-lg text-primary-foreground shadow-glow-sm">
                    {m.initials}
                  </div>
                  <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-background border-2 border-background flex items-center justify-center">
                    <span className="text-[10px] font-bold text-primary">#{i + 1}</span>
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold truncate">{m.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{m.handle}</div>
                  <div className="mt-1 text-xs text-primary font-medium truncate">Building {m.startup}</div>
                </div>
              </div>
              <div className="mt-5 pt-4 border-t border-border flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <TrendingUp className="h-3.5 w-3.5 text-primary" />
                  {m.xp.toLocaleString()} XP
                </span>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Flame className="h-3.5 w-3.5 text-primary" />
                  {m.streak} day streak
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
