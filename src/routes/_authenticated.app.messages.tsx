import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/app/messages")({
  component: Inbox,
});

type Match = { other_id: string; display_name: string | null; avatar_url: string | null };

function Inbox() {
  const { user } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("cofounder_requests")
        .select("from_user, to_user, from_profile:from_user(display_name, avatar_url), to_profile:to_user(display_name, avatar_url)")
        .eq("status", "accepted")
        .or(`from_user.eq.${user.id},to_user.eq.${user.id}`);
      const rows = ((data as unknown) as { from_user: string; to_user: string; from_profile: { display_name: string | null; avatar_url: string | null } | null; to_profile: { display_name: string | null; avatar_url: string | null } | null }[]) ?? [];
      const list: Match[] = rows.map((r) => {
        const isFrom = r.from_user === user.id;
        return { other_id: isFrom ? r.to_user : r.from_user, display_name: (isFrom ? r.to_profile : r.from_profile)?.display_name ?? null, avatar_url: (isFrom ? r.to_profile : r.from_profile)?.avatar_url ?? null };
      });
      setMatches(list);
    })();
  }, [user?.id]);

  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-bold">Messages</h1>
      {matches.length === 0 ? (
        <p className="text-sm text-muted-foreground">Match with a co-founder first to start a chat. <Link to="/app/cofounders" className="text-primary hover:underline">Browse founders →</Link></p>
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
    </div>
  );
}
