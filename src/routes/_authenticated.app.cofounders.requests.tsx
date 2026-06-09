import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/cofounders/requests")({
  component: Requests,
});

type Req = { id: string; from_user: string; to_user: string; message: string | null; status: string; created_at: string; from_profile?: { display_name: string | null; avatar_url: string | null } | null; to_profile?: { display_name: string | null; avatar_url: string | null } | null };

function Requests() {
  const { user } = useAuth();
  const [inbox, setInbox] = useState<Req[]>([]);
  const [sent, setSent] = useState<Req[]>([]);

  async function load() {
    if (!user) return;
    const [a, b] = await Promise.all([
      supabase.from("cofounder_requests").select("*, from_profile:from_user(display_name, avatar_url)").eq("to_user", user.id).order("created_at", { ascending: false }),
      supabase.from("cofounder_requests").select("*, to_profile:to_user(display_name, avatar_url)").eq("from_user", user.id).order("created_at", { ascending: false }),
    ]);
    setInbox((a.data as never) ?? []); setSent((b.data as never) ?? []);
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
        <h2 className="font-semibold mb-3">Incoming</h2>
        <div className="space-y-3">
          {inbox.map((r) => (
            <div key={r.id} className="glass-strong rounded-xl p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full gradient-primary flex items-center justify-center overflow-hidden text-xs font-bold">
                {r.from_profile?.avatar_url ? <img src={r.from_profile.avatar_url} alt="" className="h-full w-full object-cover" /> : (r.from_profile?.display_name ?? "?").slice(0,2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">{r.from_profile?.display_name}</div>
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
          ))}
          {inbox.length === 0 && <p className="text-sm text-muted-foreground">No incoming requests.</p>}
        </div>
      </section>
      <section>
        <h2 className="font-semibold mb-3">Sent</h2>
        <div className="space-y-3">
          {sent.map((r) => (
            <div key={r.id} className="glass rounded-xl p-3 flex items-center gap-3 text-sm">
              <span className="flex-1">→ {r.to_profile?.display_name}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-muted capitalize">{r.status}</span>
              {r.status === "accepted" && <Link to="/app/messages/$userId" params={{ userId: r.to_user }} className="text-primary text-xs hover:underline">Message</Link>}
            </div>
          ))}
          {sent.length === 0 && <p className="text-sm text-muted-foreground">No sent requests.</p>}
        </div>
      </section>
    </div>
  );
}
