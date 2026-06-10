import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/cofounders/requests")({
  component: Requests,
});

type Profile = { id: string; display_name: string | null; avatar_url: string | null };
type Req = { id: string; from_user: string; to_user: string; message: string | null; status: string; created_at: string };

function Requests() {
  const { user } = useAuth();
  const [inbox, setInbox] = useState<Req[]>([]);
  const [sent, setSent] = useState<Req[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});

  async function load() {
    if (!user) return;
    const [a, b] = await Promise.all([
      supabase.from("cofounder_requests").select("*").eq("to_user", user.id).order("created_at", { ascending: false }),
      supabase.from("cofounder_requests").select("*").eq("from_user", user.id).order("created_at", { ascending: false }),
    ]);
    const ins = (a.data as Req[]) ?? [];
    const outs = (b.data as Req[]) ?? [];
    setInbox(ins); setSent(outs);
    const ids = Array.from(new Set([...ins.map(r => r.from_user), ...outs.map(r => r.to_user)]));
    if (ids.length) {
      const { data: ps } = await supabase.from("profiles").select("id, display_name, avatar_url").in("id", ids);
      const map: Record<string, Profile> = {};
      (ps ?? []).forEach((p) => { map[p.id] = p as Profile; });
      setProfiles(map);
    }
  }
  useEffect(() => { load(); }, [user?.id]);

  async function respond(id: string, status: "accepted" | "declined") {
    const { error } = await supabase.from("cofounder_requests").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Request ${status}`); load();
  }

  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl font-bold">Connection requests</h1>
      <section>
        <h2 className="font-semibold mb-3">Incoming ({inbox.length})</h2>
        <div className="space-y-3">
          {inbox.map((r) => {
            const p = profiles[r.from_user];
            return (
              <div key={r.id} className="glass-strong rounded-xl p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full gradient-primary flex items-center justify-center overflow-hidden text-xs font-bold">
                  {p?.avatar_url ? <img src={p.avatar_url} alt="" className="h-full w-full object-cover" /> : (p?.display_name ?? "?").slice(0,2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{p?.display_name ?? "Unknown"}</div>
                  {r.message && <div className="text-xs text-muted-foreground truncate">{r.message}</div>}
                </div>
                {r.status === "pending" ? (
                  <>
                    <Button size="sm" variant="hero" onClick={() => respond(r.id, "accepted")}>Accept</Button>
                    <Button size="sm" variant="ghost" onClick={() => respond(r.id, "declined")}>Decline</Button>
                  </>
                ) : r.status === "accepted" ? (
                  <Link to="/app/messages/$userId" params={{ userId: r.from_user }}><Button size="sm" variant="glass">Message</Button></Link>
                ) : <span className="text-xs text-muted-foreground capitalize">{r.status}</span>}
              </div>
            );
          })}
          {inbox.length === 0 && <p className="text-sm text-muted-foreground">No incoming requests.</p>}
        </div>
      </section>
      <section>
        <h2 className="font-semibold mb-3">Sent ({sent.length})</h2>
        <div className="space-y-3">
          {sent.map((r) => {
            const p = profiles[r.to_user];
            return (
              <div key={r.id} className="glass rounded-xl p-3 flex items-center gap-3 text-sm">
                <span className="flex-1">→ {p?.display_name ?? "Unknown"}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted capitalize">{r.status}</span>
                {r.status === "accepted" && <Link to="/app/messages/$userId" params={{ userId: r.to_user }} className="text-primary text-xs hover:underline">Message</Link>}
              </div>
            );
          })}
          {sent.length === 0 && <p className="text-sm text-muted-foreground">No sent requests.</p>}
        </div>
      </section>
    </div>
  );
}
