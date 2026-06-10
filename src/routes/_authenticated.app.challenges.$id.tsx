import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/challenges/$id")({
  component: ChallengeDetail,
});

type C = { id: string; title: string; description: string | null; cover_url: string | null; status: string; starts_at: string | null; ends_at: string | null };
type P = { id: string; display_name: string | null; avatar_url: string | null };

function ChallengeDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const [c, setC] = useState<C | null>(null);
  const [members, setMembers] = useState<P[]>([]);
  const [enrolled, setEnrolled] = useState(false);

  async function load() {
    const { data } = await supabase.from("challenges").select("*").eq("id", id).maybeSingle();
    setC(data as never);
    const { data: enr } = await supabase.from("challenge_enrollments").select("user_id").eq("challenge_id", id);
    const ids = ((enr as { user_id: string }[]) ?? []).map((r) => r.user_id);
    if (user) setEnrolled(ids.includes(user.id));
    if (ids.length) {
      const { data: ps } = await supabase.from("profiles").select("id, display_name, avatar_url").in("id", ids);
      setMembers((ps as never) ?? []);
    } else setMembers([]);
  }
  useEffect(() => { load(); }, [id, user?.id]);

  async function enroll() {
    if (!user) return;
    if (enrolled) {
      await supabase.from("challenge_enrollments").delete().eq("challenge_id", id).eq("user_id", user.id);
    } else {
      const { error } = await supabase.from("challenge_enrollments").insert({ challenge_id: id, user_id: user.id });
      if (error) { toast.error(error.message); return; }
    }
    load();
  }

  if (!c) return <div className="text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-6">
      <Link to="/app/challenges" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"><ArrowLeft className="h-4 w-4" />All challenges</Link>
      {c.cover_url && <img src={c.cover_url} alt="" className="w-full h-48 object-cover rounded-2xl" />}
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-xs uppercase tracking-wider text-primary">{c.status}</span>
          <h1 className="font-display text-3xl font-bold mt-1">{c.title}</h1>
        </div>
        {c.status !== "past" && (
          <Button variant={enrolled ? "glass" : "hero"} onClick={enroll}>{enrolled ? "Enrolled ✓" : "Enroll"}</Button>
        )}
      </div>
      {c.description && <p className="text-foreground/90 whitespace-pre-wrap">{c.description}</p>}
      <div>
        <h2 className="font-semibold flex items-center gap-2 mb-3"><Users className="h-4 w-4" />{members.length} enrolled</h2>
        <div className="flex flex-wrap gap-3">
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-2 glass rounded-full px-3 py-1.5">
              <div className="h-7 w-7 rounded-full gradient-primary flex items-center justify-center overflow-hidden text-[10px] font-bold">
                {m.avatar_url ? <img src={m.avatar_url} alt="" className="h-full w-full object-cover" /> : (m.display_name ?? "?").slice(0,2).toUpperCase()}
              </div>
              <span className="text-sm">{m.display_name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
