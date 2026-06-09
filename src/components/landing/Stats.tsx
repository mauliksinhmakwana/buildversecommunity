const stats = [
  { value: "12.4K+", label: "Active Founders" },
  { value: "3.2K", label: "Startups Showcased" },
  { value: "38.2K", label: "Active Streaks" },
  { value: "$24M+", label: "Raised by Members" },
];

export function Stats() {
  return (
    <section className="relative py-16 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="glass-strong rounded-3xl p-8 sm:p-12 ember-bg shadow-elegant">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="font-display text-3xl sm:text-4xl md:text-5xl font-bold gradient-text">
                  {s.value}
                </div>
                <div className="mt-2 text-xs sm:text-sm text-muted-foreground uppercase tracking-wider">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
