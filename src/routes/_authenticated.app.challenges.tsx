import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Trophy, Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/challenges")({
  component: Challenges,
});

type C = { id: string; title: string; description: string | null; cover_url: string | null; status: "upcoming" | "ongoing" | "past"; starts_at: string | null; ends_at: string | null };

function Challenges() {
  const { user } = useAuth();
  const [list, setList] = useState<C[]>([]);
  const [enrolled, setEnrolled] = useState<Set<string>>(new Set());
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [tab, setTab] = useState<"upcoming" | "ongoing" | "past">("ongoing");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "" });

  async function load() {
    const { data } = await supabase.from("challenges").select("*").order("created_at", { ascending: false });
    setList((data as never) ?? []);
    const { data: enr } = await supabase.from("challenge_enrollments").select("challenge_id, user_id");
    const rows = ((enr as { challenge_id: string; user_id: string }[]) ?? []);
    const c: Record<string, number> = {};
    rows.forEach((r) => { c[r.challenge_id] = (c[r.challenge_id] ?? 0) + 1; });
    setCounts(c);
    if (user) setEnrolled(new Set(rows.filter((r) => r.user_id === user.id).map((r) => r.challenge_id)));
  }
  useEffect(() => { load(); }, [user?.id]);

  async function enroll(id: string) {
    if (!user) return;
    if (enrolled.has(id)) {
      await supabase.from("challenge_enrollments").delete().eq("challenge_id", id).eq("user_id", user.id);
    } else {
      const { error } = await supabase.from("challenge_enrollments").insert({ challenge_id: id, user_id: user.id });
      if (error) { toast.error(error.message); return; }
      toast.success("Enrolled!");
    }
    load();
  }

  async function submitRequest() {
    if (!user || !form.title) return;
    const { error } = await supabase.from("challenge_requests").insert({ user_id: user.id, title: form.title, description: form.description || null });
    if (error) { toast.error(error.message); return; }
    toast.success("Sent to admin");
    setForm({ title: "", description: "" }); setOpen(false);
  }

  const filtered = list.filter((c) => c.status === tab);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-display text-3xl font-bold flex items-center gap-2"><Trophy className="h-6 w-6 text-primary" /> Challenges</h1>
        <div className="flex gap-2">
          <Link to="/app/challenges/requests"><Button variant="glass" size="sm">My requests</Button></Link>
          <Button variant="hero" size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Submit Challenge Idea</Button>
        </div>
      </div>

      <div className="flex gap-2">
        {(["upcoming", "ongoing", "past"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cn("px-4 py-1.5 rounded-full text-sm capitalize border transition", tab === t ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted")}>{t}</button>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {filtered.map((c) => (
          <div key={c.id} className="glass-strong rounded-2xl p-5">
            {c.cover_url && <img src={c.cover_url} alt="" className="w-full h-32 object-cover rounded-lg mb-3" />}
            <h3 className="font-display font-bold text-lg">{c.title}</h3>
            {c.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-3">{c.description}</p>}
            <div className="text-xs text-muted-foreground mt-2 flex gap-3">
              {c.starts_at && <span>Starts: {new Date(c.starts_at).toLocaleDateString()}</span>}
              {c.ends_at && <span>Ends: {new Date(c.ends_at).toLocaleDateString()}</span>}
            </div>
            <div className="flex items-center justify-between mt-3">
              <span className="text-xs flex items-center gap-1 text-muted-foreground"><Users className="h-3.5 w-3.5" />{counts[c.id] ?? 0} participants</span>
              <div className="flex gap-2">
                <Link to="/app/challenges/$id" params={{ id: c.id }}><Button size="sm" variant="ghost">View</Button></Link>
                {c.status !== "past" && (
                  <Button size="sm" variant={enrolled.has(c.id) ? "glass" : "hero"} onClick={() => enroll(c.id)}>
                    {enrolled.has(c.id) ? "Joined ✓" : "Participate"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-muted-foreground col-span-2 text-center py-8 text-sm">No {tab} challenges.</p>}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="glass-strong rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display font-bold text-lg mb-3">Submit a challenge idea</h3>
            <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <Textarea className="mt-3" rows={4} placeholder="Describe the challenge…" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <div className="flex gap-2 mt-4">
              <Button variant="ghost" className="flex-1" onClick={() => setOpen(false)}>Cancel</Button>
              <Button variant="hero" className="flex-1" onClick={submitRequest}>Send to admin</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
