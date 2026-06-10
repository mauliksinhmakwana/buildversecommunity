import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Pencil, MapPin, Trophy, Flame, Youtube, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/profile")({
  component: Profile,
});

type Prof = { id: string; display_name: string | null; avatar_url: string | null; bio: string | null; roles: string[]; skills: string[]; interests: string[]; looking_for: string[]; location: string | null; xp: number; streak_days: number; date_of_birth: string | null; creator_enabled: boolean; cofounder_visible: boolean; links: Record<string, string> };

function Profile() {
  const { user } = useAuth();
  const [p, setP] = useState<Prof | null>(null);
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => setP(data as never));
  }, [user?.id]);

  async function toggleVisible(v: boolean) {
    if (!p || !user) return;
    setP({ ...p, cofounder_visible: v });
    const { error } = await supabase.from("profiles").update({ cofounder_visible: v }).eq("id", user.id);
    if (error) { toast.error(error.message); setP({ ...p, cofounder_visible: !v }); }
    else toast.success(v ? "Visible in Co-Founders" : "Hidden from Co-Founders");
  }

  if (!p) return <div className="text-muted-foreground">Loading…</div>;
  const links = (p.links ?? {}) as Record<string, string>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 rounded-full gradient-primary flex items-center justify-center overflow-hidden text-xl font-bold">
            {p.avatar_url ? <img src={p.avatar_url} alt="" className="h-full w-full object-cover" /> : (p.display_name ?? "?").slice(0,2).toUpperCase()}
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold">{p.display_name}</h1>
            {p.location && <div className="text-sm text-muted-foreground flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{p.location}</div>}
            <div className="flex gap-3 mt-2 text-sm">
              <span className="flex items-center gap-1 text-primary"><Trophy className="h-3.5 w-3.5" />{p.xp} XP</span>
              <span className="flex items-center gap-1 text-orange-400"><Flame className="h-3.5 w-3.5" />{p.streak_days}d</span>
            </div>
          </div>
        </div>
        <Link to="/app/onboarding"><Button variant="glass" size="sm"><Pencil className="h-3.5 w-3.5" /> Edit</Button></Link>
      </div>

      <div className="glass-strong rounded-xl p-4 flex items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          {p.cofounder_visible ? <Eye className="h-5 w-5 text-primary mt-0.5" /> : <EyeOff className="h-5 w-5 text-muted-foreground mt-0.5" />}
          <div>
            <div className="font-semibold text-sm">Show in Co-Founders</div>
            <div className="text-xs text-muted-foreground">When off, your profile is hidden from the Co-Founders directory.</div>
          </div>
        </div>
        <Switch checked={p.cofounder_visible} onCheckedChange={toggleVisible} />
      </div>

      {p.bio && <div className="glass-strong rounded-xl p-5"><p className="text-foreground/90 whitespace-pre-wrap">{p.bio}</p></div>}

      <Section title="Roles">{p.roles.map((r) => <Pill key={r}>{r}</Pill>)}</Section>
      {p.looking_for.length > 0 && <Section title="Looking for">{p.looking_for.map((r) => <Pill key={r}>{r}</Pill>)}</Section>}
      {p.skills.length > 0 && <Section title="Skills">{p.skills.map((r) => <Pill key={r}>{r}</Pill>)}</Section>}
      {p.interests.length > 0 && <Section title="Interests">{p.interests.map((r) => <Pill key={r}>{r}</Pill>)}</Section>}

      {p.creator_enabled && (
        <div className="glass-strong rounded-xl p-5">
          <h3 className="font-display font-bold flex items-center gap-2"><Youtube className="h-5 w-5 text-primary" /> Creator profile</h3>
          <p className="text-sm text-muted-foreground mt-1">Share your content with the community.</p>
          <div className="flex flex-wrap gap-2 mt-3 text-sm">
            {Object.entries(links).filter(([_, v]) => v).map(([k, v]) => (
              <a key={k} href={v} target="_blank" rel="noopener noreferrer" className="px-3 py-1 rounded-full bg-primary/15 text-primary hover:bg-primary/25 capitalize">{k} →</a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{title}</div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
function Pill({ children }: { children: React.ReactNode }) {
  return <span className="px-2.5 py-1 rounded-full text-sm bg-muted capitalize">{children}</span>;
}
