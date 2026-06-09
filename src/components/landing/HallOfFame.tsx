import { Crown, Award, Star } from "lucide-react";

const legends = [
  { name: "Elena Voss", achievement: "365-day build streak", xp: "98,420", icon: Crown },
  { name: "Rahim Patel", achievement: "Reached $1M ARR in public", xp: "84,210", icon: Award },
  { name: "Mei Tanaka", achievement: "Validated 50+ founders' ideas", xp: "76,540", icon: Star },
];

export function HallOfFame() {
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
            Members who didn't just show up — they shaped the forge.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {legends.map((l, i) => (
            <div
              key={l.name}
              className="relative glass-strong rounded-3xl p-8 text-center overflow-hidden group hover:-translate-y-2 transition-all duration-500"
            >
              <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-primary/20 blur-3xl group-hover:bg-primary/30 transition-all duration-500" />
              <div className="relative">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl gradient-primary shadow-glow mb-5 animate-pulse-glow">
                  <l.icon className="h-7 w-7 text-primary-foreground" />
                </div>
                <div className="text-xs text-primary font-semibold uppercase tracking-widest mb-2">
                  Legend #{i + 1}
                </div>
                <h3 className="font-display text-2xl font-bold mb-2">{l.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{l.achievement}</p>
                <div className="inline-flex items-center gap-2 glass rounded-full px-3 py-1">
                  <span className="text-xs text-muted-foreground">XP</span>
                  <span className="text-sm font-bold gradient-text">{l.xp}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
