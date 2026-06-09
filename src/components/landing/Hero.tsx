import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroBg from "@/assets/hero-bg.jpg";

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-28 pb-20">
      {/* Background layers */}
      <div className="absolute inset-0 -z-10">
        <img
          src={heroBg}
          alt=""
          width={1920}
          height={1280}
          className="absolute inset-0 w-full h-full object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/60 to-background" />
        <div className="absolute inset-0 grid-bg opacity-50" />
      </div>

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
        <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 mb-8 animate-fade-up">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs sm:text-sm text-muted-foreground">
            Now welcoming founders from <span className="text-foreground font-medium">120+ countries</span>
          </span>
        </div>

        <h1
          className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold leading-[1.05] tracking-tight animate-fade-up"
          style={{ animationDelay: "0.1s" }}
        >
          Where Founders
          <br />
          Are <span className="gradient-text">Forged.</span>
        </h1>

        <p
          className="mt-6 text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto animate-fade-up"
          style={{ animationDelay: "0.2s" }}
        >
          A premium community for founders, builders, creators, and innovators.
          Build in public, showcase startups, find your co-founder, and rise through the ranks.
        </p>

        <div
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 px-4 animate-fade-up"
          style={{ animationDelay: "0.3s" }}
        >
          <Button variant="hero" size="xl" className="w-full sm:w-auto group">
            Join the Forge
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Button>
          <Button variant="glass" size="xl" className="w-full sm:w-auto">
            Explore Community
          </Button>
        </div>

        <div
          className="mt-14 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-muted-foreground animate-fade-up"
          style={{ animationDelay: "0.4s" }}
        >
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            12,400+ active builders
          </span>
          <span>⭐ 4.9 / 5 founder rating</span>
          <span>🔥 38,200 streaks burning</span>
        </div>
      </div>
    </section>
  );
}
