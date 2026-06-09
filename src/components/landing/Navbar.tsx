import { useState } from "react";
import { Flame, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const links = [
  { label: "Community", href: "#features" },
  { label: "Showcase", href: "#members" },
  { label: "Hall of Fame", href: "#hall" },
  { label: "Testimonials", href: "#testimonials" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  return (
    <header className="fixed top-0 inset-x-0 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-4">
        <nav className="glass-strong rounded-2xl px-4 sm:px-6 py-3 flex items-center justify-between shadow-elegant">
          <a href="#" className="flex items-center gap-2 group">
            <div className="relative">
              <div className="absolute inset-0 bg-primary blur-md opacity-60 group-hover:opacity-100 transition-opacity" />
              <Flame className="relative h-6 w-6 text-primary" />
            </div>
            <span className="font-display font-bold text-lg tracking-tight">
              Founder<span className="text-primary">Forge</span>
            </span>
          </a>
          <div className="hidden md:flex items-center gap-8">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {l.label}
              </a>
            ))}
          </div>
          <div className="hidden md:flex items-center gap-2">
            <Button variant="ghost" size="sm">Sign in</Button>
            <Button variant="hero" size="sm">Join the Forge</Button>
          </div>
          <button
            className="md:hidden text-foreground p-2"
            onClick={() => setOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </nav>
        {open && (
          <div className="md:hidden mt-2 glass-strong rounded-2xl p-4 flex flex-col gap-3 animate-fade-up">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="text-sm text-muted-foreground hover:text-foreground py-1"
              >
                {l.label}
              </a>
            ))}
            <div className="flex flex-col gap-2 pt-2 border-t border-border">
              <Button variant="ghost" size="sm">Sign in</Button>
              <Button variant="hero" size="sm">Join the Forge</Button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
