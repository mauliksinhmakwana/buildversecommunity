import { createFileRoute, Outlet, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, User, Sparkles, Lightbulb, Users, MessageCircle, Hash,
  BookOpen, Trophy, Award, Shield, LogOut, Menu, X, Flame, Zap, Rss, Target
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useIsAdmin } from "@/lib/use-role";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app")({
  component: AppShell,
});

const NAV = [
  { to: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/app/feed", label: "Feed", icon: Rss },
  { to: "/app/showcase", label: "Showcase", icon: Sparkles },
  { to: "/app/ideas", label: "Post Idea", icon: Lightbulb },
  { to: "/app/challenges", label: "Challenges", icon: Target },
  { to: "/app/cofounders", label: "Co-Founders", icon: Users },
  { to: "/app/messages", label: "Messages", icon: MessageCircle },
  { to: "/app/community", label: "Community", icon: Hash },
  { to: "/app/resources", label: "Resources", icon: BookOpen },
  { to: "/app/leaderboard", label: "Leaderboard", icon: Trophy },
  { to: "/app/hall", label: "Hall of Fame", icon: Award },
  { to: "/app/profile", label: "Profile", icon: User },
] as const;

function AppShell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = useIsAdmin();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [me, setMe] = useState<{ display_name: string | null; avatar_url: string | null; xp: number; streak_days: number; onboarded: boolean } | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("display_name, avatar_url, xp, streak_days, onboarded").eq("id", user.id).maybeSingle()
      .then(({ data }) => {
        setMe(data as never);
        if (data && !data.onboarded && !pathname.includes("/app/onboarding")) {
          navigate({ to: "/app/onboarding" });
        }
      });
  }, [user?.id, pathname]);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const items = isAdmin ? [...NAV, { to: "/app/admin" as const, label: "Admin", icon: Shield }] : NAV;
  const initials = (me?.display_name || user?.email || "?").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-card/40 backdrop-blur-xl sticky top-0 h-screen">
        <SidebarInner items={items} pathname={pathname} signOut={signOut} />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" onClick={() => setMobileOpen(false)}>
          <aside className="w-72 h-full bg-card border-r border-border flex flex-col" onClick={(e) => e.stopPropagation()}>
            <SidebarInner items={items} pathname={pathname} signOut={signOut} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-40 glass-strong border-b border-border px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button className="md:hidden p-2 -ml-2" onClick={() => setMobileOpen(true)} aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </button>
            <Link to="/" className="md:hidden flex items-center gap-2">
              <Logo size="sm" />
            </Link>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/15 border border-primary/30">
              <Zap className="h-3.5 w-3.5 text-primary" /><span className="text-xs font-semibold">{me?.xp ?? 0} XP</span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/15 border border-orange-500/30">
              <Flame className="h-3.5 w-3.5 text-orange-400" /><span className="text-xs font-semibold">{me?.streak_days ?? 0}d</span>
            </div>
            <Link to="/app/profile" className="h-9 w-9 rounded-full gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground overflow-hidden">
              {me?.avatar_url ? <img src={me.avatar_url} className="h-full w-full object-cover" alt="" /> : initials}
            </Link>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function SidebarInner({ items, pathname, signOut, onNavigate }: { items: readonly { to: string; label: string; icon: typeof LayoutDashboard }[]; pathname: string; signOut: () => void; onNavigate?: () => void }) {
  return (
    <>
      <div className="p-5 flex items-center justify-between border-b border-border">
        <Link to="/" onClick={onNavigate} className="flex items-center gap-2">
          <Logo size="md" />
          <span className="font-display font-bold">Build<span className="text-primary">Verse</span></span>
        </Link>
        {onNavigate && <button onClick={onNavigate}><X className="h-5 w-5" /></button>}
      </div>
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {items.map((it) => {
          const Icon = it.icon;
          const active = pathname === it.to || pathname.startsWith(it.to + "/");
          return (
            <Link key={it.to} to={it.to as never} onClick={onNavigate}
              className={cn("flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                active ? "bg-primary/15 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted/50")}>
              <Icon className="h-4 w-4" /> {it.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-border">
        <Button variant="ghost" size="sm" className="w-full justify-start" onClick={signOut}>
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </div>
    </>
  );
}
