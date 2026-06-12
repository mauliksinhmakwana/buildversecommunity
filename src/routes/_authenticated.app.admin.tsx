import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/lib/use-role";
import { Shield } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/admin")({
  component: Admin,
});

function Admin() {
  const isAdmin = useIsAdmin();
  const [counts, setCounts] = useState({ users: 0, posts: 0, groups: 0, resources: 0 });

  useEffect(() => {
    if (!isAdmin) return;
    Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("posts").select("*", { count: "exact", head: true }),
      supabase.from("groups").select("*", { count: "exact", head: true }),
      supabase.from("resources").select("*", { count: "exact", head: true }),
    ]).then(([a, b, c, d]) => setCounts({ users: a.count ?? 0, posts: b.count ?? 0, groups: c.count ?? 0, resources: d.count ?? 0 }));
  }, [isAdmin]);

  if (!isAdmin) return <p className="text-muted-foreground">Admin access only.</p>;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold flex items-center gap-2"><Shield className="h-6 w-6 text-primary" /> Admin</h1>
      <div className="grid sm:grid-cols-4 gap-3">
        <Stat label="Members" v={counts.users} />
        <Stat label="Posts" v={counts.posts} />
        <Stat label="Groups" v={counts.groups} />
        <Stat label="Resources" v={counts.resources} />
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <Link to="/app/community" className="glass-strong rounded-xl p-4 hover:bg-card/70">Create & moderate community groups →</Link>
        <Link to="/app/admin/challenges" className="glass-strong rounded-xl p-4 hover:bg-card/70">Manage challenges →</Link>
        <Link to="/app/admin/requests" className="glass-strong rounded-xl p-4 hover:bg-card/70">All user requests →</Link>
        <Link to="/app/hall" className="glass-strong rounded-xl p-4 hover:bg-card/70">Add Hall of Fame entries →</Link>
        <Link to="/app/resources" className="glass-strong rounded-xl p-4 hover:bg-card/70">Post official resources →</Link>
      </div>
    </div>
  );
}
function Stat({ label, v }: { label: string; v: number }) {
  return <div className="glass-strong rounded-xl p-4"><div className="text-xs text-muted-foreground">{label}</div><div className="font-display text-2xl font-bold">{v}</div></div>;
}
