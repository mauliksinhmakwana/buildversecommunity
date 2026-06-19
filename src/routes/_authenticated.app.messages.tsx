import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/messages")({
  component: Inbox,
});

type Match = { other_id: string; display_name: string | null; avatar_url: string | null };
type PendingReq = { id: string; from_user: string; message: string | null; created_at: string; display_name: string | null; avatar_url: string | null };

function Inbox() {
  const { user } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [pending, setPending] = useState<PendingReq[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!user) return;
    setLoading(true);
    const [{ data: reqs }, { data: dms }, { data: incoming }] = await Promise.all([
      supabase.from("cofounder_requests")
        .select("from_user, to_user")
        .eq("status", "accepted")
        .or(`from_user.eq.${user.id},to_user.eq.${user.id}`),
      supabase.from("direct_messages")
        .select("from_user, to_user, created_at")
        .or(`from_user.eq.${user.id},to_user.eq.${user.id}`)
        .order("created_at", { ascending: false }).limit(200),
      supabase.from("cofounder_requests")
        .select("id, from_user, message, created_at")
        .eq("to_user", user.id).eq("status", "pending")
        .order("created_at", { ascending: false }),
    ]);
    const ids = new Set<string>();
    ((reqs as { from_user: string; to_user: string }[]) ?? []).forEach((r) => {
      ids.add(r.from_user === user.id ? r.to_user : r.from_user);
    });
    ((dms as { from_user: string; to_user: string }[]) ?? []).forEach((m) => {
      ids.add(m.from_user === user.id ? m.to_user : m.from_user);
    });
    const pendingRows = (incoming as { id: string; from_user: string; message: string | null; created_at: string }[]) ?? [];
    const allProfIds = Array.from(new Set([...ids, ...pendingRows.map((r) => r.from_user)]));
    const pmap = new Map<string, { display_name: string | null; avatar_url: string | null }>();
    if (allProfIds.length) {
      const { data: ps } = await supabase.from("profiles").select("id, display_name, avatar_url").in("id", allProfIds);
      ((ps as { id: string; display_name: string | null; avatar_url: string | null }[]) ?? []).forEach((p) => pmap.set(p.id, p));
    }
    setMatches(Array.from(ids).map((id) => ({
      other_id: id,
      display_name: pmap.get(id)?.display_name ?? "Unknown",
      avatar_url: pmap.get(id)?.avatar_url ?? null,
    })));
    setPending(pendingRows.map((r) => ({
      ...r,
      display_name: pmap.get(r.from_user)?.display_name ?? "Unknown",
      avatar_url: pmap.get(r.from_user)?.avatar_url ?? null,
    })));
    setLoading(false);
  }

  useEffect(() => { load(); }, [user?.id]);

  async function respond(id: string, fromUser: string, status: "accepted" | "declined") {
    const { error } = await supabase.from("cofounder_requests").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Request ${status}`);
    if (status === "accepted") {
      // jump straight to chat with that user
      window.location.href = `/app/messages/${fromUser}`;
      return;
    }
    load();
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">Messages</h1>

      {pending.length > 0 && (
        <section>
          <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-2">Incoming requests ({pending.length})</h2>
          <div className="space-y-2">
            {pending.map((r) => (
              <div key={r.id} className="glass-strong rounded-xl p-3 flex items-center gap-3">
                <Link to="/app/u/$userId" params={{ userId: r.from_user }} className="h-10 w-10 rounded-full gradient-primary flex items-center justify-center overflow-hidden text-xs font-bold flex-shrink-0">
                  {r.avatar_url ? <img src={r.avatar_url} alt="" className="h-full w-full object-cover" /> : (r.display_name ?? "?").slice(0,2).toUpperCase()}
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{r.display_name}</div>
                  {r.message && <div className="text-xs text-muted-foreground truncate">"{r.message}"</div>}
                </div>
                <Button size="sm" variant="hero" onClick={() => respond(r.id, r.from_user, "accepted")}>Accept</Button>
                <Button size="sm" variant="ghost" onClick={() => respond(r.id, r.from_user, "declined")}>Decline</Button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-2">Chats</h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : matches.length === 0 ? (
          <p className="text-sm text-muted-foreground">No conversations yet. <Link to="/app/cofounders" className="text-primary hover:underline">Find people to message →</Link></p>
        ) : (
          <div className="space-y-2">
            {matches.map((m) => (
              <Link key={m.other_id} to="/app/messages/$userId" params={{ userId: m.other_id }} className="glass rounded-xl p-3 flex items-center gap-3 hover:bg-card/70 transition">
                <div className="h-10 w-10 rounded-full gradient-primary flex items-center justify-center overflow-hidden text-xs font-bold">
                  {m.avatar_url ? <img src={m.avatar_url} alt="" className="h-full w-full object-cover" /> : (m.display_name ?? "?").slice(0,2).toUpperCase()}
                </div>
                <div className="font-medium">{m.display_name}</div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
