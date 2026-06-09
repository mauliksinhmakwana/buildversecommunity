import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/leaderboard")({
  component: Leaderboard,
});

type P = { id: string; display_name: string | null; avatar_url: string | null; xp: number; streak_days: number };

function Leaderboard() {
  const [tab, setTab] = useState<"xp" | "streak">("xp");
  const [list, setList] = useState<P[]>([]);

  useEffect(() => {
    const order = tab === "xp" ? "xp" : "streak_days";
    supabase.from("profiles").select("id, display_name, avatar_url, xp, streak_days").order(order, { ascending: false }).limit(100)
      .then(({ data }) => setList((data as never) ?? []));
  }, [tab]);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold flex items-center gap-2"><Trophy className="h-6 w-6 text-primary" /> Leaderboard</h1>
      <div className="flex gap-2">
        <button onClick={() => setTab("xp")} className={cn("px-4 py-1.5 rounded-full text-sm font-medium border", tab === "xp" ? "bg-primary text-primary-foreground border-primary" : "border-border")}>XP</button>
        <button onClick={() => setTab("streak")} className={cn("px-4 py-1.5 rounded-full text-sm font-medium border", tab === "streak" ? "bg-primary text-primary-foreground border-primary" : "border-border")}>Streak</button>
      </div>
      <div className="glass-strong rounded-2xl overflow-hidden">
        {list.map((p, i) => (
          <div key={p.id} className="flex items-center gap-3 p-3 border-b border-border last:border-0">
            <div className={cn("w-8 text-center font-display font-bold", i < 3 ? "text-primary text-lg" : "text-muted-foreground")}>{i + 1}</div>
            <div className="h-9 w-9 rounded-full gradient-primary flex items-center justify-center overflow-hidden text-xs font-bold">
              {p.avatar_url ? <img src={p.avatar_url} alt="" className="h-full w-full object-cover" /> : (p.display_name ?? "?").slice(0,2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0 font-medium truncate">{p.display_name ?? "Anon"}</div>
            <div className="flex items-center gap-3 text-sm">
              {tab === "xp" ? (
                <span className="font-bold text-primary">{p.xp} XP</span>
              ) : (
                <span className="font-bold text-orange-400 flex items-center gap-1"><Flame className="h-4 w-4" />{p.streak_days}d</span>
              )}
            </div>
          </div>
        ))}
        {list.length === 0 && <p className="text-muted-foreground text-center p-8">No members yet.</p>}
      </div>
    </div>
  );
}
