import {
  Rocket, Users, Lightbulb, BookOpen, Trophy, Zap, Crown, Bell,
} from "lucide-react";

const features = [
  { icon: Zap, title: "Build In Public", desc: "Post daily updates, share wins, fail forward, and earn XP for showing up." },
  { icon: Rocket, title: "Startup Showcase", desc: "Launch your SaaS, MVP, or idea to a community that actually upvotes and tests." },
  { icon: Users, title: "Co-Founder Matching", desc: "Find a technical, design, or growth partner with rich profile filters." },
  { icon: Lightbulb, title: "Startup Validator", desc: "Submit your idea, get a validation score, real feedback, and improvements." },
  { icon: BookOpen, title: "Founder Vault", desc: "A curated library of guides, AI tools, funding decks, and growth playbooks." },
  { icon: Trophy, title: "Leaderboard", desc: "Rise through XP, streaks, and contributions — weekly, monthly, all-time." },
  { icon: Crown, title: "Hall of Fame", desc: "The legends wall. Top builders and contributors immortalized." },
  { icon: Bell, title: "Live Notifications", desc: "Comments, XP, badge unlocks, and Hall of Fame inductions in real time." },
];

export function Features() {
  return (
    <section id="features" className="relative py-24 sm:py-32 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-2xl mb-16">
          <div className="inline-flex items-center gap-2 glass rounded-full px-3 py-1 mb-4">
            <span className="text-xs text-primary font-medium uppercase tracking-wider">The Ecosystem</span>
          </div>
          <h2 className="font-display text-4xl sm:text-5xl font-bold leading-tight">
            Everything a founder needs.
            <br />
            <span className="gradient-text">In one forge.</span>
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            Eight pillars built to take you from idea → MVP → traction → legend.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="group relative glass rounded-2xl p-6 hover:bg-white/[0.06] transition-all duration-500 hover:-translate-y-1 hover:shadow-glow-sm"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/0 to-primary/0 group-hover:from-primary/10 group-hover:to-transparent transition-all duration-500 pointer-events-none" />
              <div className="relative">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 mb-4 group-hover:bg-primary/20 group-hover:shadow-glow-sm transition-all">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-display font-semibold text-lg mb-1.5">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
