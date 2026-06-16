import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Users, CheckCircle2, Clock, Play, Calendar } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/challenges/$id")({
  component: ChallengeDetail,
});

type C = { id: string; title: string; description: string | null; cover_url: string | null; status: string; starts_at: string | null; ends_at: string | null };
type Enrollment = { id: string; user_id: string; status: "joined" | "in_progress" | "completed"; progress: number; note: string | null; updated_at: string };
type Member = Enrollment & { display_name: string | null; avatar_url: string | null };

const STATUS_META: Record<Enrollment["status"], { label: string; icon: typeof Clock; cls: string }> = {
  joined: { label: "Joined", icon: Clock, cls: "bg-muted text-foreground/70" },
  in_progress: { label: "In progress", icon: Play, cls: "bg-primary/15 text-primary" },
  completed: { label: "Completed", icon: CheckCircle2, cls: "bg-emerald-500/15 text-emerald-400" },
};

function ChallengeDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const [c, setC] = useState<C | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [mine, setMine] = useState<Enrollment | null>(null);
  const [note, setNote] = useState("");
  const [progress, setProgress] = useState(0);
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data } = await supabase.from("challenges").select("*").eq("id", id).maybeSingle();
    setC(data as never);
    const { data: enr } = await supabase
      .from("challenge_enrollments")
      .select("id, user_id, status, progress, note, updated_at")
      .eq("challenge_id", id);
    const rows = ((enr as Enrollment[]) ?? []);
    const ids = rows.map((r) => r.user_id);
    let profilesMap = new Map<string, { display_name: string | null; avatar_url: string | null }>();
    if (ids.length) {
      const { data: ps } = await supabase.from("profiles").select("id, display_name, avatar_url").in("id", ids);
      profilesMap = new Map(((ps as { id: string; display_name: string | null; avatar_url: string | null }[]) ?? []).map((p) => [p.id, p]));
    }
    const enriched: Member[] = rows.map((r) => ({ ...r, ...(profilesMap.get(r.user_id) ?? { display_name: null, avatar_url: null }) }));
    enriched.sort((a, b) => b.progress - a.progress);
    setMembers(enriched);
    const me = user ? rows.find((r) => r.user_id === user.id) ?? null : null;
    setMine(me);
    setNote(me?.note ?? "");
    setProgress(me?.progress ?? 0);
  }
  useEffect(() => { load(); }, [id, user?.id]);

  async function join() {
    if (!user) return;
    const { error } = await supabase.from("challenge_enrollments")
      .insert({ challenge_id: id, user_id: user.id, status: "joined", progress: 0 });
    if (error) { toast.error(error.message); return; }
    toast.success("You're in!"); load();
  }

  async function leave() {
    if (!user) return;
    if (!confirm("Leave this challenge? Your progress will be removed.")) return;
    await supabase.from("challenge_enrollments").delete().eq("challenge_id", id).eq("user_id", user.id);
    toast.success("Left the challenge"); load();
  }

  async function saveProgress(nextStatus?: Enrollment["status"]) {
    if (!user || !mine) return;
    setSaving(true);
    const computedStatus: Enrollment["status"] =
      nextStatus ?? (progress >= 100 ? "completed" : progress > 0 ? "in_progress" : "joined");
    const finalProgress = computedStatus === "completed" ? 100 : progress;
    const { error } = await supabase.from("challenge_enrollments")
      .update({ status: computedStatus, progress: finalProgress, note: note || null })
      .eq("id", mine.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(computedStatus === "completed" ? "Marked complete 🎉" : "Progress saved");
    load();
  }

  if (!c) return <div className="text-muted-foreground">Loading…</div>;

  const completedCount = members.filter((m) => m.status === "completed").length;
  const canParticipate = c.status !== "past";

  return (
    <div className="space-y-6">
      <Link to="/app/challenges" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"><ArrowLeft className="h-4 w-4" />All challenges</Link>
      {c.cover_url && <img src={c.cover_url} alt="" className="w-full h-48 object-cover rounded-2xl" />}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <span className="text-xs uppercase tracking-wider text-primary">{c.status}</span>
          <h1 className="font-display text-3xl font-bold mt-1">{c.title}</h1>
          <div className="text-xs text-muted-foreground mt-2 flex flex-wrap gap-3">
            {c.starts_at && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Starts {new Date(c.starts_at).toLocaleDateString()}</span>}
            {c.ends_at && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Ends {new Date(c.ends_at).toLocaleDateString()}</span>}
          </div>
        </div>
        {canParticipate && !mine && <Button variant="hero" onClick={join}>Participate</Button>}
        {mine && <Button variant="ghost" onClick={leave}>Leave</Button>}
      </div>

      {c.description && <p className="text-foreground/90 whitespace-pre-wrap">{c.description}</p>}

      {mine && canParticipate && (
        <div className="glass-strong rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold">Your participation</h2>
            <StatusPill status={mine.status} />
          </div>
          <div>
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Progress</span><span>{progress}%</span>
            </div>
            <input type="range" min={0} max={100} step={5} value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              className="w-full accent-primary" />
            <div className="h-2 mt-1 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <Textarea rows={3} placeholder="Notes, submission link, what you built…" value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="flex gap-2 flex-wrap">
            <Button variant="hero" size="sm" onClick={() => saveProgress()} disabled={saving}>Save progress</Button>
            {mine.status !== "completed" && (
              <Button variant="glass" size="sm" onClick={() => { setProgress(100); saveProgress("completed"); }} disabled={saving}>
                <CheckCircle2 className="h-4 w-4" /> Mark complete
              </Button>
            )}
          </div>
        </div>
      )}

      <div>
        <h2 className="font-semibold flex items-center gap-3 mb-3">
          <Users className="h-4 w-4" /> {members.length} participants
          {completedCount > 0 && <span className="text-xs text-emerald-400">· {completedCount} completed</span>}
        </h2>
        <div className="space-y-2">
          {members.map((m) => (
            <div key={m.id} className="glass rounded-xl p-3 flex items-center gap-3">
              <Link to="/app/u/$userId" params={{ userId: m.user_id }} className="flex items-center gap-2 flex-1 min-w-0 hover:text-primary">
                <div className="h-9 w-9 rounded-full gradient-primary flex items-center justify-center overflow-hidden text-[10px] font-bold flex-shrink-0">
                  {m.avatar_url ? <img src={m.avatar_url} alt="" className="h-full w-full object-cover" /> : (m.display_name ?? "?").slice(0,2).toUpperCase()}
                </div>
                <span className="text-sm font-medium truncate">{m.display_name ?? "User"}</span>
              </Link>
              <div className="hidden sm:block w-32">
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${m.progress}%` }} />
                </div>
              </div>
              <StatusPill status={m.status} />
            </div>
          ))}
          {members.length === 0 && <p className="text-sm text-muted-foreground">No one has joined yet — be the first!</p>}
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: Enrollment["status"] }) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium", meta.cls)}>
      <Icon className="h-3 w-3" /> {meta.label}
    </span>
  );
}
