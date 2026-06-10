import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Trophy, Calendar } from "lucide-react";

type C = { id: string; title: string; description: string | null; cover_url: string | null; status: string; starts_at: string | null; ends_at: string | null };

export function Challenges() {
  const [list, setList] = useState<C[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.from("challenges").select("*").in("status", ["upcoming", "ongoing"]).order("created_at", { ascending: false }).limit(6)
      .then(({ data }) => setList((data as never) ?? []));
  }, []);

  if (list.length === 0) return null;

  return (
    <section id="challenges" className="py-20 sm:py-28 relative">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs font-semibold text-primary mb-4">
            <Trophy className="h-3.5 w-3.5" /> Live Challenges
          </div>
          <h2 className="font-display text-3xl sm:text-5xl font-bold tracking-tight">
            Build. Compete. <span className="text-primary">Win.</span>
          </h2>
          <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">Join community challenges, ship under deadline, get recognized.</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {list.map((c) => (
            <div key={c.id} className="glass-strong rounded-2xl overflow-hidden hover:shadow-glow-sm transition-all duration-300">
              {c.cover_url && <img src={c.cover_url} alt="" className="w-full h-36 object-cover" />}
              <div className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${c.status === "ongoing" ? "bg-green-500/20 text-green-400" : "bg-primary/15 text-primary"}`}>{c.status}</span>
                  {c.ends_at && <span className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(c.ends_at).toLocaleDateString()}</span>}
                </div>
                <h3 className="font-display font-bold text-lg">{c.title}</h3>
                {c.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{c.description}</p>}
                <Button variant="hero" size="sm" className="mt-4 w-full" onClick={() => navigate({ to: "/auth" })}>Sign in to enroll</Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
