import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/lib/use-role";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/admin/challenges")({
  component: AdminChallenges,
});

type C = { id: string; title: string; description: string | null; cover_url: string | null; status: "upcoming" | "ongoing" | "past"; starts_at: string | null; ends_at: string | null };
type R = { id: string; user_id: string; title: string; description: string | null; status: string; created_at: string };
type M = { id: string; request_id: string; from_user: string; body: string; created_at: string };
type P = { id: string; display_name: string | null; avatar_url: string | null };

function AdminChallenges() {
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  const [list, setList] = useState<C[]>([]);
  const [reqs, setReqs] = useState<R[]>([]);
  const [requesters, setRequesters] = useState<Record<string, P>>({});
  const [editing, setEditing] = useState<Partial<C> | null>(null);
  const [openReq, setOpenReq] = useState<R | null>(null);
  const [msgs, setMsgs] = useState<M[]>([]);
  const [body, setBody] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  async function load() {
    const { data } = await supabase.from("challenges").select("*").order("created_at", { ascending: false });
    setList((data as never) ?? []);
    const { data: r } = await supabase.from("challenge_requests").select("*").order("created_at", { ascending: false });
    const rows = (r as R[]) ?? [];
    setReqs(rows);
    const ids = Array.from(new Set(rows.map((x) => x.user_id)));
    if (ids.length) {
      const { data: ps } = await supabase.from("profiles").select("id, display_name, avatar_url").in("id", ids);
      const map: Record<string, P> = {};
      (ps ?? []).forEach((p) => { map[p.id] = p as P; });
      setRequesters(map);
    }
  }
  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  useEffect(() => {
    if (!openReq) { setMsgs([]); return; }
    supabase.from("challenge_request_messages").select("*").eq("request_id", openReq.id).order("created_at").then(({ data }) => setMsgs((data as never) ?? []));
    const ch = supabase.channel(`acreq-${openReq.id}`).on("postgres_changes",
      { event: "INSERT", schema: "public", table: "challenge_request_messages", filter: `request_id=eq.${openReq.id}` },
      (payload) => setMsgs((p) => [...p, payload.new as M])
    ).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [openReq?.id]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs.length]);

  if (!isAdmin) return <p className="text-muted-foreground">Admin only.</p>;

  async function save() {
    if (!editing || !user || !editing.title) return;
    const payload = {
      title: editing.title, description: editing.description ?? null, cover_url: editing.cover_url ?? null,
      status: editing.status ?? "upcoming",
      starts_at: editing.starts_at || null, ends_at: editing.ends_at || null,
    };
    if (editing.id) {
      const { error } = await supabase.from("challenges").update(payload).eq("id", editing.id);
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await supabase.from("challenges").insert({ ...payload, created_by: user.id });
      if (error) { toast.error(error.message); return; }
    }
    toast.success("Saved"); setEditing(null); load();
  }

  async function del(id: string) {
    if (!confirm("Delete this challenge?")) return;
    const { error } = await supabase.from("challenges").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  }

  async function setReqStatus(id: string, status: "approved" | "rejected") {
    const { error } = await supabase.from("challenge_requests").update({ status }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success(status); load(); }
  }

  async function send() {
    if (!user || !openReq || !body.trim()) return;
    const { error } = await supabase.from("challenge_request_messages").insert({ request_id: openReq.id, from_user: user.id, body: body.trim() });
    if (error) toast.error(error.message); else setBody("");
  }

  return (
    <div className="space-y-6">
      <Link to="/app/admin" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"><ArrowLeft className="h-4 w-4" />Admin</Link>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-2xl font-bold">Manage challenges</h2>
          <Button variant="hero" size="sm" onClick={() => setEditing({ status: "upcoming" })}><Plus className="h-4 w-4" />New</Button>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {list.map((c) => (
            <div key={c.id} className="glass-strong rounded-xl p-4">
              <div className="font-semibold flex justify-between items-start">
                <span>{c.title}</span>
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/15 text-primary">{c.status}</span>
              </div>
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="ghost" onClick={() => setEditing(c)}><Pencil className="h-3.5 w-3.5" />Edit</Button>
                <Button size="sm" variant="ghost" onClick={() => del(c.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-display text-2xl font-bold mb-3">Challenge requests ({reqs.length})</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {reqs.map((r) => {
              const p = requesters[r.user_id];
              return (
                <button key={r.id} onClick={() => setOpenReq(r)} className={cn("w-full text-left glass-strong rounded-xl p-3 hover:bg-card/70", openReq?.id === r.id && "ring-2 ring-primary")}>
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full gradient-primary flex items-center justify-center overflow-hidden text-[10px] font-bold flex-shrink-0">
                      {p?.avatar_url ? <img src={p.avatar_url} alt="" className="h-full w-full object-cover" /> : (p?.display_name ?? "?").slice(0,2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate">{r.title}</div>
                      <div className="text-xs text-muted-foreground truncate">{p?.display_name} · <span className="capitalize">{r.status}</span></div>
                    </div>
                  </div>
                </button>
              );
            })}
            {reqs.length === 0 && <p className="text-sm text-muted-foreground">No requests.</p>}
          </div>
          <div className="glass-strong rounded-2xl flex flex-col h-[60vh]">
            {openReq ? (
              <>
                <div className="p-3 border-b border-border">
                  <div className="font-semibold">{openReq.title}</div>
                  {openReq.description && <div className="text-xs text-muted-foreground mt-1">{openReq.description}</div>}
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" variant="hero" onClick={() => setReqStatus(openReq.id, "approved")}>Approve</Button>
                    <Button size="sm" variant="ghost" onClick={() => setReqStatus(openReq.id, "rejected")}>Reject</Button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {msgs.map((m) => {
                    const mine = m.from_user === user?.id;
                    return (
                      <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                        <div className={cn("max-w-[80%] rounded-2xl px-3 py-2 text-sm", mine ? "bg-primary text-primary-foreground" : "glass")}>{m.body}</div>
                      </div>
                    );
                  })}
                  <div ref={endRef} />
                </div>
                <div className="p-3 border-t border-border flex gap-2">
                  <Input value={body} onChange={(e) => setBody(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Reply…" />
                  <Button variant="hero" onClick={send}>Send</Button>
                </div>
              </>
            ) : <p className="text-sm text-muted-foreground p-6">Select a request.</p>}
          </div>
        </div>
      </section>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="glass-strong rounded-2xl p-6 max-w-md w-full space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display font-bold text-lg">{editing.id ? "Edit" : "New"} challenge</h3>
            <Input placeholder="Title" value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
            <Textarea placeholder="Description" rows={4} value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
            <Input placeholder="Cover image URL" value={editing.cover_url ?? ""} onChange={(e) => setEditing({ ...editing, cover_url: e.target.value })} />
            <select value={editing.status ?? "upcoming"} onChange={(e) => setEditing({ ...editing, status: e.target.value as C["status"] })} className="w-full bg-transparent border border-border rounded-md px-3 py-2 text-sm">
              <option value="upcoming">Upcoming</option><option value="ongoing">Ongoing</option><option value="past">Past</option>
            </select>
            <div className="grid grid-cols-2 gap-2">
              <Input type="date" value={editing.starts_at?.slice(0,10) ?? ""} onChange={(e) => setEditing({ ...editing, starts_at: e.target.value })} />
              <Input type="date" value={editing.ends_at?.slice(0,10) ?? ""} onChange={(e) => setEditing({ ...editing, ends_at: e.target.value })} />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="ghost" className="flex-1" onClick={() => setEditing(null)}>Cancel</Button>
              <Button variant="hero" className="flex-1" onClick={save}>Save</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
