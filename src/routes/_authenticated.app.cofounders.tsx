import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Send } from "lucide-react";
import { toast } from "sonner";
import { LOOKING_FOR_OPTIONS, ROLES_OPTIONS } from "@/lib/panel";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/cofounders")({
  component: Cofounders,
});

type Member = { id: string; display_name: string | null; avatar_url: string | null; bio: string | null; roles: string[]; skills: string[]; looking_for: string[]; location: string | null; xp: number };

function Cofounders() {
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [lfFilter, setLfFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [requested, setRequested] = useState<Set<string>>(new Set());
  const [modal, setModal] = useState<{ to: string; name: string } | null>(null);
  const [message, setMessage] = useState("");

  async function load() {
    let q = supabase.from("profiles").select("id, display_name, avatar_url, bio, roles, skills, looking_for, location, xp").eq("onboarded", true).order("xp", { ascending: false }).limit(60);
    if (user) q = q.neq("id", user.id);
    const { data } = await q;
    setMembers((data as never) ?? []);
    if (user) {
      const { data: reqs } = await supabase.from("cofounder_requests").select("to_user").eq("from_user", user.id);
      setRequested(new Set((reqs ?? []).map((r) => r.to_user)));
    }
  }
  useEffect(() => { load(); }, [user?.id]);

  const filtered = members.filter((m) => {
    if (roleFilter && !m.roles.includes(roleFilter)) return false;
    if (lfFilter && !m.looking_for.includes(lfFilter)) return false;
    if (search && !`${m.display_name} ${m.bio} ${m.skills.join(" ")}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  async function sendRequest() {
    if (!user || !modal) return;
    const { error } = await supabase.from("cofounder_requests").insert({ from_user: user.id, to_user: modal.to, message: message || null });
    if (error) { toast.error(error.message); return; }
    toast.success("Connect request sent!");
    setRequested(new Set([...requested, modal.to])); setModal(null); setMessage("");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold">Co-Founders</h1>
        <Link to="/app/cofounders/requests" className="text-sm text-primary hover:underline">View requests →</Link>
      </div>

      <div className="glass-strong rounded-xl p-3 flex flex-wrap gap-2 items-center">
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="bg-transparent border border-border rounded-md px-2 py-1 text-sm">
          <option value="">All roles</option>{ROLES_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={lfFilter} onChange={(e) => setLfFilter(e.target.value)} className="bg-transparent border border-border rounded-md px-2 py-1 text-sm">
          <option value="">Looking for…</option>{LOOKING_FOR_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, skill…" className="flex-1 min-w-[160px]" />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((m) => (
          <div key={m.id} className="glass-strong rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <div className="h-12 w-12 rounded-full gradient-primary flex items-center justify-center overflow-hidden font-bold">
                {m.avatar_url ? <img src={m.avatar_url} className="h-full w-full object-cover" alt="" /> : (m.display_name ?? "?").slice(0,2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{m.display_name}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">{m.location && <><MapPin className="h-3 w-3" />{m.location}</>}</div>
              </div>
            </div>
            {m.bio && <p className="text-sm text-foreground/80 mt-3 line-clamp-2">{m.bio}</p>}
            <div className="flex flex-wrap gap-1 mt-3">
              {m.roles.slice(0,3).map((r) => <span key={r} className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-primary/15 text-primary">{r}</span>)}
            </div>
            <Button size="sm" variant={requested.has(m.id) ? "glass" : "hero"} className="w-full mt-4" disabled={requested.has(m.id)} onClick={() => setModal({ to: m.id, name: m.display_name ?? "this founder" })}>
              <Send className="h-3.5 w-3.5" /> {requested.has(m.id) ? "Requested" : "Connect"}
            </Button>
          </div>
        ))}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="glass-strong rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display font-bold text-lg">Connect with {modal.name}</h3>
            <Textarea className="mt-3" rows={4} placeholder="Say hi…" value={message} onChange={(e) => setMessage(e.target.value)} />
            <div className="flex gap-2 mt-4">
              <Button variant="ghost" onClick={() => setModal(null)} className="flex-1">Cancel</Button>
              <Button variant="hero" onClick={sendRequest} className="flex-1">Send request</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
