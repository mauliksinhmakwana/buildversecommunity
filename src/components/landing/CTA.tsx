import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";

export function CTA() {
  return (
    <section className="relative py-24 sm:py-32 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="relative glass-strong rounded-3xl p-10 sm:p-16 text-center overflow-hidden ember-bg shadow-elegant">
          <div className="absolute inset-0 grid-bg opacity-30" />
          <div className="relative">
            <div className="inline-flex h-14 w-14 items-center justify-center mb-6 animate-pulse-glow rounded-full">
              <Logo size="lg" />
            </div>
            <h2 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold leading-tight">
              Your forge <span className="gradient-text">is waiting.</span>
            </h2>
            <p className="mt-5 text-muted-foreground text-lg max-w-xl mx-auto">
              Join 1000+ founders shipping in public, validating ideas, and rising together.
            </p>
            <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 px-4">
             
              <Button variant="hero" size="xl" className="w-full sm:w-auto group">
                Create your account
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
             
            </div>
            <p className="mt-6 text-xs text-muted-foreground">
              Free to join · No credit card · Cancel anytime
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
