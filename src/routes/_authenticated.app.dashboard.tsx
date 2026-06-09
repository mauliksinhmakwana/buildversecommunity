import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Flame, Trophy, Lightbulb, Sparkles, Users, MessageCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const [streakBody, setStreakBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [profile, setProfile] = useState<{ xp: number; streak_days: number; display_name: string | null } | null>(null);
  const [recent, setRecent] = useState<{ id: string; type: string; title: string | null; body: string; created_at: string; profiles?: { display_name: string | null; avatar_url: string | null } | null }[]>([]);

  async function refresh() {
    if (!user) return;
    const [{ data: p }, { data: posts }] = await Promise.all([
      supabase.from("profiles").select("xp, streak_days, display_name").eq("id", user.id).maybeSingle(),
      supabase.from("posts").select("id, type, title, body, created_at, profiles:user_id(display_name, avatar_url)").order("created_at", { ascending: false }).limit(8),
    ]);
    setProfile(p as never);
    setRecent((posts as never) ?? []);
  }
  useEffect(() => { refresh(); }, [user?.id]);

  async function postStreak() {
    if (!user || !streakBody.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("posts").insert({ user_id: user.id, type: "streak", body: streakBody.trim() });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setStreakBody(""); toast.success("Streak +1 🔥"); refresh();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Hey, {profile?.display_name?.split(" ")[0] || "founder"} 👋</h1>
        <p className="text-muted-foreground mt-1">Here's what's happening in the Forge today.</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard icon={Trophy} label="Total XP" value={profile?.xp ?? 0} />
        <StatCard icon={Flame} label="Current streak" value={`${profile?.streak_days ?? 0}d`} tint="orange" />
        <StatCard icon={Users} label="Community" value="Live" />
      </div>

      <div className="glass-strong rounded-2xl p-6">
        <h2 className="font-semibold flex items-center gap-2"><Flame className="h-4 w-4 text-orange-400" /> Post today's update</h2>
        <p className="text-sm text-muted-foreground mt-1">Keep your streak alive. One post a day.</p>
        <Textarea value={streakBody} onChange={(e) => setStreakBody(e.target.value)} placeholder="What did you build today?" rows={3} className="mt-3" />
        <div className="flex justify-end mt-3">
          <Button variant="hero" onClick={postStreak} disabled={busy || !streakBody.trim()}>{busy ? "Posting…" : "Post update"}</Button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <QuickLink to="/app/showcase" icon={Sparkles} title="Showcase" desc="See what builders are shipping" />
        <QuickLink to="/app/ideas" icon={Lightbulb} title="Validate an idea" desc="Get AI + community feedback" />
        <QuickLink to="/app/cofounders" icon={Users} title="Find a co-founder" desc="Match with builders like you" />
        <QuickLink to="/app/community" icon={MessageCircle} title="Community" desc="Chat in the groups" />
      </div>

      <div>
        <h2 className="font-display text-xl font-bold mb-3">Latest from the community</h2>
        <div className="space-y-3">
          {recent.map((p) => (
            <div key={p.id} className="glass rounded-xl p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary capitalize">{p.type}</span>
                <span>·</span>
                <span>{p.profiles?.display_name ?? "Anon"}</span>
              </div>
              {p.title && <div className="font-semibold">{p.title}</div>}
              <div className="text-sm text-foreground/90 line-clamp-3">{p.body}</div>
            </div>
          ))}
          {recent.length === 0 && <p className="text-sm text-muted-foreground">No posts yet. Be the first!</p>}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tint }: { icon: typeof Trophy; label: string; value: string | number; tint?: "orange" }) {
  return (
    <div className="glass-strong rounded-2xl p-5 flex items-center gap-4">
      <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${tint === "orange" ? "bg-orange-500/15 text-orange-400" : "bg-primary/15 text-primary"}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-2xl font-display font-bold">{value}</div>
      </div>
    </div>
  );
}
function QuickLink({ to, icon: Icon, title, desc }: { to: string; icon: typeof Trophy; title: string; desc: string }) {
  return (
    <Link to={to as never} className="glass-strong rounded-xl p-4 flex items-center gap-3 hover:bg-card/70 transition group">
      <Icon className="h-5 w-5 text-primary group-hover:scale-110 transition" />
      <div>
        <div className="font-semibold text-sm">{title}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
    </Link>
  );
}
