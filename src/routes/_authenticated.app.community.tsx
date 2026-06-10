import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/lib/use-role";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Hash, Plus, Pin, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/community")({
  component: Community,
});

type G = { id: string; name: string; description: string | null; image_url: string | null; is_pinned: boolean; cover_url: string | null };

function Community() {
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  const [groups, setGroups] = useState<G[]>([]);
  const [myGroupIds, setMyGroupIds] = useState<Set<string>>(new Set());
  const [form, setForm] = useState({ name: "", description: "", open: false });
  const [editing, setEditing] = useState<G | null>(null);

  async function load() {
    const [{ data: g }, { data: m }] = await Promise.all([
      supabase.from("groups").select("*").order("is_pinned", { ascending: false }).order("created_at", { ascending: false }),
      user ? supabase.from("group_members").select("group_id").eq("user_id", user.id) : Promise.resolve({ data: [] }),
    ]);
    setGroups((g as never) ?? []);
    setMyGroupIds(new Set(((m as { group_id: string }[]) ?? []).map((x) => x.group_id)));
  }
  useEffect(() => { load(); }, [user?.id]);

  async function create() {
    if (!form.name) return;
    const { data, error } = await supabase.from("groups").insert({ name: form.name, description: form.description || null, created_by: user!.id }).select("id").single();
    if (error) { toast.error(error.message); return; }
    await supabase.from("group_members").insert({ group_id: data.id, user_id: user!.id });
    setForm({ name: "", description: "", open: false });
    toast.success("Group created"); load();
  }

  async function join(id: string) {
    if (!user) return;
    const { error } = await supabase.from("group_members").insert({ group_id: id, user_id: user.id });
    if (error) { toast.error(error.message); return; }
    load();
  }

  async function togglePin(g: G) {
    const { error } = await supabase.from("groups").update({ is_pinned: !g.is_pinned }).eq("id", g.id);
    if (error) toast.error(error.message); else load();
  }

  async function saveEdit() {
    if (!editing) return;
    const { error } = await supabase.from("groups").update({ name: editing.name, description: editing.description }).eq("id", editing.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved"); setEditing(null); load();
  }

  async function del(g: G) {
    if (!confirm(`Delete "${g.name}"? This cannot be undone.`)) return;
    const { error } = await supabase.from("groups").delete().eq("id", g.id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold flex items-center gap-2"><Hash className="h-6 w-6 text-primary" /> Community</h1>
        {isAdmin && <Button variant="hero" size="sm" onClick={() => setForm({ ...form, open: !form.open })}><Plus className="h-4 w-4" /> New group</Button>}
      </div>

      {isAdmin && form.open && (
        <div className="glass-strong rounded-2xl p-5 space-y-3">
          <Input placeholder="Group name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Textarea placeholder="Description" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Button variant="hero" onClick={create}>Create group</Button>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        {groups.map((g) => (
          <div key={g.id} className="glass-strong rounded-2xl p-4">
            <div className="font-display font-bold text-lg flex items-center gap-2">
              {g.is_pinned && <Pin className="h-4 w-4 text-primary fill-current" />}
              # {g.name}
            </div>
            {g.description && <p className="text-sm text-muted-foreground mt-1">{g.description}</p>}
            <div className="mt-3 flex gap-2 flex-wrap">
              {myGroupIds.has(g.id) ? (
                <Link to="/app/community/$groupId" params={{ groupId: g.id }}><Button size="sm" variant="hero">Open chat</Button></Link>
              ) : (
                <Button size="sm" variant="glass" onClick={() => join(g.id)}>Join</Button>
              )}
              {isAdmin && (
                <>
                  <Button size="sm" variant="ghost" onClick={() => togglePin(g)}><Pin className="h-3.5 w-3.5" />{g.is_pinned ? "Unpin" : "Pin"}</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(g)}><Pencil className="h-3.5 w-3.5" />Edit</Button>
                  <Button size="sm" variant="ghost" onClick={() => del(g)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </>
              )}
            </div>
          </div>
        ))}
        {groups.length === 0 && <p className="text-muted-foreground col-span-2 text-center py-8">{isAdmin ? "Create the first group above." : "No groups yet. Ask an admin to create one."}</p>}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="glass-strong rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display font-bold text-lg mb-3">Edit group</h3>
            <Input className="mb-3" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            <Textarea rows={3} value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
            <div className="flex gap-2 mt-4">
              <Button variant="ghost" className="flex-1" onClick={() => setEditing(null)}>Cancel</Button>
              <Button variant="hero" className="flex-1" onClick={saveEdit}>Save</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
