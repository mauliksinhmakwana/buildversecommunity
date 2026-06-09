import { useState } from "react";
import { Menu, X, LogOut } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/lib/auth-context";

const links = [
  { label: "Community", href: "#features" },
  { label: "Members", href: "#members" },
  { label: "Hall of Fame", href: "#hall" },
  { label: "Testimonials", href: "#testimonials" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();

  const initials = (user?.user_metadata?.display_name || user?.user_metadata?.full_name || user?.email || "?")
    .toString()
    .trim()
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="fixed top-0 inset-x-0 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-4">
        <nav className="glass-strong rounded-2xl px-4 sm:px-6 py-3 flex items-center justify-between shadow-elegant">
          <Link to="/" className="flex items-center gap-2 group">
            <Logo size="md" />
            <span className="font-display font-bold text-lg tracking-tight">
              Founder<span className="text-primary">Forge</span>
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            {links.map((l) => (
              <a key={l.href} href={l.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {l.label}
              </a>
            ))}
          </div>
          <div className="hidden md:flex items-center gap-2">
            {loading ? null : user ? (
              <>
                <Button variant="hero" size="sm" onClick={() => navigate({ to: "/app/dashboard" })}>
                  Open panel
                </Button>
                <Button variant="ghost" size="sm" onClick={signOut}>
                  <LogOut className="h-4 w-4" /> Sign out
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/auth" })}>
                  Sign in
                </Button>
                <Button variant="hero" size="sm" onClick={() => navigate({ to: "/auth" })}>
                  Join the Forge
                </Button>
              </>
            )}
          </div>
          <button className="md:hidden text-foreground p-2" onClick={() => setOpen((o) => !o)} aria-label="Toggle menu">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </nav>
        {open && (
          <div className="md:hidden mt-2 glass-strong rounded-2xl p-4 flex flex-col gap-3 animate-fade-up">
            {links.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="text-sm text-muted-foreground hover:text-foreground py-1">
                {l.label}
              </a>
            ))}
            <div className="flex flex-col gap-2 pt-2 border-t border-border">
              {user ? (
                <Button variant="ghost" size="sm" onClick={signOut}>
                  <LogOut className="h-4 w-4" /> Sign out
                </Button>
              ) : (
                <>
                  <Button variant="ghost" size="sm" onClick={() => { setOpen(false); navigate({ to: "/auth" }); }}>
                    Sign in
                  </Button>
                  <Button variant="hero" size="sm" onClick={() => { setOpen(false); navigate({ to: "/auth" }); }}>
                    Join the Forge
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
