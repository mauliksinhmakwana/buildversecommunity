const testimonials = [
  {
    quote: "FounderForge replaced three different communities for me. Build in public + co-founder matching in one place is unreal.",
    name: "Jordan Reyes", role: "Founder, Plume AI", initials: "JR",
  },
  {
    quote: "The Startup Validator gave me feedback that saved 6 months of building the wrong thing. The XP system actually keeps me shipping.",
    name: "Anika Sharma", role: "Solo founder, Brightleaf", initials: "AS",
  },
  {
    quote: "I found my technical co-founder here in 11 days. We launched our MVP two months later. The Forge is the real deal.",
    name: "Tomás Herrera", role: "CEO, Mosaic Labs", initials: "TH",
  },
];

export function Testimonials() {
  return (
    <section id="testimonials" className="relative py-24 sm:py-32 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-2xl mb-16">
          <div className="inline-flex items-center gap-2 glass rounded-full px-3 py-1 mb-4">
            <span className="text-xs text-primary font-medium uppercase tracking-wider">Testimonials</span>
          </div>
          <h2 className="font-display text-4xl sm:text-5xl font-bold">
            Founders <span className="gradient-text">don't ship alone.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <figure
              key={t.name}
              className="glass rounded-2xl p-7 flex flex-col justify-between hover:bg-white/[0.06] transition-all duration-500"
            >
              <blockquote className="text-base leading-relaxed text-foreground/90">
                "{t.quote}"
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-3 pt-6 border-t border-border">
                <div className="h-10 w-10 rounded-full gradient-primary flex items-center justify-center font-semibold text-sm text-primary-foreground">
                  {t.initials}
                </div>
                <div>
                  <div className="text-sm font-semibold">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
