import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { Stats } from "@/components/landing/Stats";
import { FeaturedMembers } from "@/components/landing/FeaturedMembers";
import { HallOfFame } from "@/components/landing/HallOfFame";
import { Testimonials } from "@/components/landing/Testimonials";
import { CTA } from "@/components/landing/CTA";
import { Footer } from "@/components/landing/Footer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FounderForge — Where Founders Are Forged" },
      { name: "description", content: "A premium community for founders, builders, creators, and innovators. Build in public, showcase startups, find co-founders, validate ideas, climb the leaderboard." },
      { property: "og:title", content: "FounderForge — Where Founders Are Forged" },
      { property: "og:description", content: "Premium founder community: build in public, startup showcase, co-founder matching, validation, XP & leaderboards." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="relative min-h-screen bg-background text-foreground overflow-x-hidden">
      <Navbar />
      <Hero />
      <Stats />
      <Features />
      <FeaturedMembers />
      <HallOfFame />
      <Testimonials />
      <CTA />
      <Footer />
    </main>
  );
}
