import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/messages/")({
  component: Inbox,
});

type Conv = {
  other_id: string;
  display_name: string | null;
  avatar_url: string | null;
  last_body: string | null;
  last_at: string | null;
  unread: number;
};
type PendingReq = { id: string; from_user: string; message: string | null; created_at: string; display_name: string | null; avatar_url: string | null };

function lastSeenKey(me: string, other: string) {
  return `dm:lastseen:${me}:${other}`;
}

function Inbox() {
  const { user } = useAuth();
  const [convs, setConvs] = useState<Conv[]>([]);
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
        .select("from_user, to_user, body, created_at")
        .or(`from_user.eq.${user.id},to_user.eq.${user.id}`)
        .order("created_at", { ascending: false }).limit(500),
      supabase.from("cofounder_requests")
        .select("id, from_user, message, created_at")
        .eq("to_user", user.id).eq("status", "pending")
        .order("created_at", { ascending: false }),
    ]);

    const others = new Set<string>();
    const lastMsg = new Map<string, { body: string | null; at: string }>();
    const unread = new Map<string, number>();

    ((reqs as { from_user: string; to_user: string }[]) ?? []).forEach((r) => {
      others.add(r.from_user === user.id ? r.to_user : r.from_user);
    });
    ((dms as { from_user: string; to_user: string; body: string | null; created_at: string }[]) ?? []).forEach((m) => {
      const other = m.from_user === user.id ? m.to_user : m.from_user;
      others.add(other);
      if (!lastMsg.has(other)) lastMsg.set(other, { body: m.body, at: m.created_at });
      if (m.to_user === user.id) {
        const seen = localStorage.getItem(lastSeenKey(user.id, other));
        if (!seen || m.created_at > seen) unread.set(other, (unread.get(other) ?? 0) + 1);
      }
    });

    const pendingRows = (incoming as { id: string; from_user: string; message: string | null; created_at: string }[]) ?? [];
    const allIds = Array.from(new Set([...others, ...pendingRows.map((r) => r.from_user)]));
    const pmap = new Map<string, { display_name: string | null; avatar_url: string | null }>();
    if (allIds.length) {
      const { data: ps } = await supabase.from("profiles").select("id, display_name, avatar_url").in("id", allIds);
      ((ps ?? []) as { id: string; display_name: string | null; avatar_url: string | null }[])
        .forEach((p) => pmap.set(p.id, p));
    }

    const list: Conv[] = Array.from(others).map((id) => ({
      other_id: id,
      display_name: pmap.get(id)?.display_name ?? "Unknown",
      avatar_url: pmap.get(id)?.avatar_url ?? null,
      last_body: lastMsg.get(id)?.body ?? null,
      last_at: lastMsg.get(id)?.at ?? null,
      unread: unread.get(id) ?? 0,
    })).sort((a, b) => (b.last_at ?? "").localeCompare(a.last_at ?? ""));
    setConvs(list);

    setPending(pendingRows.map((r) => ({
      ...r,
      display_name: pmap.get(r.from_user)?.display_name ?? "Unknown",
      avatar_url: pmap.get(r.from_user)?.avatar_url ?? null,
    })));
    setLoading(false);
  }

  useEffect(() => { load(); }, [user?.id]);

  // realtime: refresh inbox on any DM in/out
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`inbox-${user.id}`).on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "direct_messages" },
      (payload) => {
        const m = payload.new as { from_user: string; to_user: string };
        if (m.from_user === user.id || m.to_user === user.id) load();
      },
    ).on(
      "postgres_changes",
      { event: "*", schema: "public", table: "cofounder_requests", filter: `to_user=eq.${user.id}` },
      () => load(),
    ).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  async function respond(id: string, fromUser: string, status: "accepted" | "declined") {
    const { error } = await supabase.from("cofounder_requests")
      .update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Request ${status}`);
    if (status === "accepted") {
      // small delay then route to thread
      setTimeout(() => { window.location.href = `/app/messages/${fromUser}`; }, 200);
      return;
    }
    load();
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">Messages</h1>

      {pending.length > 0 && (
        <section>
          <h2 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-2">Incoming requests ({pending.length})</h2>
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
        <h2 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-2">Chats</h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : convs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No conversations yet. <Link to="/app/cofounders" className="text-primary hover:underline">Find people to message →</Link></p>
        ) : (
          <div className="space-y-1">
            {convs.map((c) => (
              <Link key={c.other_id} to="/app/messages/$userId" params={{ userId: c.other_id }}
                className="glass rounded-xl p-3 flex items-center gap-3 hover:bg-card/70 transition">
                <div className="h-11 w-11 rounded-full gradient-primary flex items-center justify-center overflow-hidden text-xs font-bold flex-shrink-0">
                  {c.avatar_url ? <img src={c.avatar_url} alt="" className="h-full w-full object-cover" /> : (c.display_name ?? "?").slice(0,2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className={cn("font-medium truncate", c.unread > 0 && "font-semibold")}>{c.display_name}</div>
                    {c.last_at && <span className="text-[10px] text-muted-foreground flex-shrink-0">{new Date(c.last_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className={cn("text-xs truncate", c.unread > 0 ? "text-foreground" : "text-muted-foreground")}>
                      {c.last_body ?? "Say hi 👋"}
                    </div>
                    {c.unread > 0 && (
                      <span className="text-[10px] font-bold bg-primary text-primary-foreground rounded-full min-w-[18px] h-[18px] px-1.5 flex items-center justify-center">
                        {c.unread}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
