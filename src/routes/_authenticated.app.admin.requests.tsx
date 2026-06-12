import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/lib/use-role";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/admin/requests")({
  component: AdminRequests,
});

type CoReq = { id: string; from_user: string; to_user: string; message: string | null; status: string; created_at: string };
type ChReq = { id: string; user_id: string; title: string; description: string | null; status: string; created_at: string };
type P = { id: string; display_name: string | null; avatar_url: string | null };

function AdminRequests() {
  const isAdmin = useIsAdmin();
  const [co, setCo] = useState<CoReq[]>([]);
  const [ch, setCh] = useState<ChReq[]>([]);
  const [profs, setProfs] = useState<Record<string, P>>({});
  const [tab, setTab] = useState<"cofounders" | "challenges">("cofounders");

  async function load() {
    const [{ data: a }, { data: b }] = await Promise.all([
      supabase.from("cofounder_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("challenge_requests").select("*").order("created_at", { ascending: false }),
    ]);
    const cos = (a as CoReq[]) ?? [];
    const chs = (b as ChReq[]) ?? [];
    setCo(cos); setCh(chs);
    const ids = Array.from(new Set([...cos.flatMap((r) => [r.from_user, r.to_user]), ...chs.map((r) => r.user_id)]));
    if (ids.length) {
      const { data: ps } = await supabase.from("profiles").select("id, display_name, avatar_url").in("id", ids);
      const m: Record<string, P> = {};
      (ps ?? []).forEach((p) => { m[p.id] = p as P; });
      setProfs(m);
    }
  }
  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  if (!isAdmin) return <p className="text-muted-foreground">Admin only.</p>;

  async function setChStatus(id: string, status: string) {
    const { error } = await supabase.from("challenge_requests").update({ status }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success(status); load(); }
  }
  async function setCoStatus(id: string, status: string) {
    const { error } = await supabase.from("cofounder_requests").update({ status }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success(status); load(); }
  }
  async function delCo(id: string) {
    if (!confirm("Delete this request?")) return;
    const { error } = await supabase.from("cofounder_requests").delete().eq("id", id);
    if (error) toast.error(error.message); else load();
  }
  async function delCh(id: string) {
    if (!confirm("Delete this request?")) return;
    const { error } = await supabase.from("challenge_requests").delete().eq("id", id);
    if (error) toast.error(error.message); else load();
  }

  return (
    <div className="space-y-6">
      <Link to="/app/admin" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"><ArrowLeft className="h-4 w-4" />Admin</Link>
      <h1 className="font-display text-3xl font-bold">All Requests</h1>

      <div className="flex gap-2">
        {(["cofounders", "challenges"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cn("px-4 py-1.5 rounded-full text-sm capitalize border transition",
            tab === t ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted")}>
            {t === "cofounders" ? `Co-Founders (${co.length})` : `Challenges (${ch.length})`}
          </button>
        ))}
      </div>

      {tab === "cofounders" ? (
        <div className="space-y-2">
          {co.map((r) => {
            const from = profs[r.from_user]; const to = profs[r.to_user];
            return (
              <div key={r.id} className="glass-strong rounded-xl p-4 flex items-center gap-3 flex-wrap">
                <Link to="/app/u/$userId" params={{ userId: r.from_user }} className="flex items-center gap-2 hover:opacity-80">
                  <Avatar p={from} /><span className="text-sm font-semibold">{from?.display_name ?? "Unknown"}</span>
                </Link>
                <span className="text-muted-foreground text-sm">→</span>
                <Link to="/app/u/$userId" params={{ userId: r.to_user }} className="flex items-center gap-2 hover:opacity-80">
                  <Avatar p={to} /><span className="text-sm font-semibold">{to?.display_name ?? "Unknown"}</span>
                </Link>
                <div className="flex-1 min-w-0">
                  {r.message && <div className="text-xs text-muted-foreground truncate">"{r.message}"</div>}
                </div>
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted">{r.status}</span>
                <div className="flex gap-1">
                  {r.status === "pending" && <>
                    <Button size="sm" variant="hero" onClick={() => setCoStatus(r.id, "accepted")}>Accept</Button>
                    <Button size="sm" variant="ghost" onClick={() => setCoStatus(r.id, "declined")}>Decline</Button>
                  </>}
                  <Button size="sm" variant="ghost" onClick={() => delCo(r.id)} className="text-destructive">Delete</Button>
                </div>
              </div>
            );
          })}
          {co.length === 0 && <p className="text-sm text-muted-foreground">No co-founder requests.</p>}
        </div>
      ) : (
        <div className="space-y-2">
          {ch.map((r) => {
            const u = profs[r.user_id];
            return (
              <div key={r.id} className="glass-strong rounded-xl p-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <Link to="/app/u/$userId" params={{ userId: r.user_id }} className="flex items-center gap-2 hover:opacity-80">
                    <Avatar p={u} /><span className="text-sm font-semibold">{u?.display_name ?? "Unknown"}</span>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{r.title}</div>
                    {r.description && <div className="text-xs text-muted-foreground line-clamp-2">{r.description}</div>}
                  </div>
                  <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted">{r.status}</span>
                  <div className="flex gap-1">
                    {r.status === "pending" && <>
                      <Button size="sm" variant="hero" onClick={() => setChStatus(r.id, "approved")}>Approve</Button>
                      <Button size="sm" variant="ghost" onClick={() => setChStatus(r.id, "rejected")}>Reject</Button>
                    </>}
                    <Link to="/app/admin/challenges"><Button size="sm" variant="glass">Reply</Button></Link>
                    <Button size="sm" variant="ghost" onClick={() => delCh(r.id)} className="text-destructive">Delete</Button>
                  </div>
                </div>
              </div>
            );
          })}
          {ch.length === 0 && <p className="text-sm text-muted-foreground">No challenge requests.</p>}
        </div>
      )}
    </div>
  );
}

function Avatar({ p }: { p?: P }) {
  return (
    <div className="h-8 w-8 rounded-full gradient-primary flex items-center justify-center overflow-hidden text-[10px] font-bold flex-shrink-0">
      {p?.avatar_url ? <img src={p.avatar_url} alt="" className="h-full w-full object-cover" /> : (p?.display_name ?? "?").slice(0,2).toUpperCase()}
    </div>
  );
}
